import { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { Database } from './database';
import { autoUpdater } from 'electron-updater';

// Auto-updater event logging
autoUpdater.on('update-available', () => {
  console.log('Update available – downloading...');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded – will be installed on restart.');
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

let mainWindow: BrowserWindow | null = null;
let db: Database;
let lastText: string = '';
let lastImageHash: string | null = null;
let pollInterval: NodeJS.Timeout | null = null;
let tray: Tray | null = null;
let isPaused = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;

  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      win.hide();
    }
  });
}

function startClipboardPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(() => {
    const text = clipboard.readText().trim();
    const image = clipboard.readImage();

    if (text && text !== lastText) {
      lastText = text;
      db.insertTextEntry(text);
      mainWindow?.webContents.send('clipboard-updated');
      return;
    }

    if (!image.isEmpty()) {
      const pngBuffer = image.toPNG();
      const hash = pngBuffer.toString('base64');
      if (hash !== lastImageHash) {
        lastImageHash = hash;
        const clipsDir = path.join(app.getPath('userData'), 'clips');
        const fs = require('fs');
        if (!fs.existsSync(clipsDir)) {
          fs.mkdirSync(clipsDir, { recursive: true });
        }
        const filename = `clip-${Date.now()}.png`;
        const filePath = path.join(clipsDir, filename);
        fs.writeFileSync(filePath, pngBuffer);
        db.insertImageEntry(filePath);
        mainWindow?.webContents.send('clipboard-updated');
      }
    }
  }, 500);
}

function stopClipboardPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

app.whenReady().then(() => {
  db = new Database(path.join(app.getPath('userData'), 'clipstack.db'));
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });
    // Auto-update: check GitHub Releases for updates
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify();

  createWindow();
  startClipboardPolling();

  const iconPath = path.join(__dirname, 'icon.png');
  try {
    tray = new Tray(iconPath);
  } catch {
    tray = null; // If icon file is missing or invalid, skip tray
  }
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show/Hide ClipStack',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    tray.setToolTip('ClipStack');
    tray.setContextMenu(contextMenu);
  }

  globalShortcut.register('Control+Shift+H', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle('get-entries', (_event, query: string) => {
    return db.getEntries(query);
  });

  ipcMain.handle('delete-entry', (_event, id: number) => {
    db.deleteEntry(id);
  });

  ipcMain.handle('toggle-pin', (_event, id: number) => {
    db.togglePin(id);
  });

  ipcMain.handle('copy-entry', (_event, content: string) => {
    clipboard.writeText(content);
  });

  ipcMain.handle('copy-image-entry', async (_event, id: number) => {
    const dbModule = require('./database') as typeof import('./database');
    const rows = dbModule.Database.prototype.getEntries.call(db, '');
    const entry = rows.find((e: any) => e.id === id);
    if (entry && entry.type === 'image' && entry.imagePath) {
      const fs = require('fs');
      const data = fs.readFileSync(entry.imagePath);
      const img = nativeImage.createFromBuffer(data);
      clipboard.writeImage(img);
    }
  });

  ipcMain.handle('clear-all', () => {
    db.clearAll();
  });

  ipcMain.handle('toggle-pause-tracking', () => {
    isPaused = !isPaused;
    if (isPaused) {
      // Stop polling entirely and reset last seen values
      stopClipboardPolling();
      lastText = '';
      lastImageHash = null;
    } else {
      // Prime lastText/lastImageHash with current clipboard contents so
      // the first clipboard state after resuming is treated as already seen.
      const currentText = clipboard.readText().trim();
      const currentImage = clipboard.readImage();
      lastText = currentText || '';
      lastImageHash = !currentImage.isEmpty()
        ? currentImage.toPNG().toString('base64')
        : null;

      // Resume polling from scratch
      startClipboardPolling();
    }
    if (mainWindow) {
      mainWindow.webContents.send('pause-state-changed', isPaused);
    }
  });

  ipcMain.handle('get-pause-state', () => {
    return isPaused;
  });

  ipcMain.handle('set-max-history', (_event, limit: number | null) => {
    db.setMaxHistory(limit);
  });

  ipcMain.handle('get-max-history', () => {
    return db.getMaxHistory();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  stopClipboardPolling();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopClipboardPolling();
  tray?.destroy();
  tray = null;
});
