import { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Tray, Menu } from 'electron';
import path from 'path';
import { Database } from './database';

let mainWindow: BrowserWindow | null = null;
let db: Database;
let lastText: string = '';
let pollInterval: NodeJS.Timeout | null = null;
let tray: Tray | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
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
    if (text && text !== lastText) {
      console.log('New clipboard text detected:', text);  // <— add this line
      lastText = text;
      db.insertEntry(text);
      mainWindow?.webContents.send('clipboard-updated');
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

  ipcMain.handle('clear-all', () => {
    db.clearAll();
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
