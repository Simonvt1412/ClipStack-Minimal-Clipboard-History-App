import { contextBridge, ipcRenderer } from 'electron';

export type ClipEntry = {
  id: number;
  content: string | null;
  timestamp: string;
  pinned: number;
  type: 'text' | 'image';
  imagePath: string | null;
};

contextBridge.exposeInMainWorld('clipstack', {
  getEntries: (query: string) => ipcRenderer.invoke('get-entries', query),
  deleteEntry: (id: number) => ipcRenderer.invoke('delete-entry', id),
  togglePin: (id: number) => ipcRenderer.invoke('toggle-pin', id),
  copyEntry: (content: string) => ipcRenderer.invoke('copy-entry', content),
  copyImageEntry: (id: number) => ipcRenderer.invoke('copy-image-entry', id),
  clearAll: () => ipcRenderer.invoke('clear-all'),
  togglePauseTracking: () => ipcRenderer.invoke('toggle-pause-tracking'),
  getPauseState: () => ipcRenderer.invoke('get-pause-state'),
  setMaxHistory: (limit: number | null) => ipcRenderer.invoke('set-max-history', limit),
  getMaxHistory: () => ipcRenderer.invoke('get-max-history'),
  onClipboardUpdated: (callback: () => void) => {
    ipcRenderer.on('clipboard-updated', callback);
  },
  onPauseStateChanged: (callback: (paused: boolean) => void) => {
    ipcRenderer.on('pause-state-changed', (_event, paused: boolean) => callback(paused));
  },
  getVersion: () => process.versions.electron ? ipcRenderer.sendSync('get-app-version') : ''
});

declare global {
  interface Window {
    clipstack: {
      getEntries: (query: string) => Promise<ClipEntry[]>;
      deleteEntry: (id: number) => Promise<void>;
      togglePin: (id: number) => Promise<void>;
      copyEntry: (content: string) => Promise<void>;
      copyImageEntry: (id: number) => Promise<void>;
      clearAll: () => Promise<void>;
      togglePauseTracking: () => Promise<void>;
      getPauseState: () => Promise<boolean>;
      setMaxHistory: (limit: number | null) => Promise<void>;
      getMaxHistory: () => Promise<number | null>;
      onClipboardUpdated: (callback: () => void) => void;
      onPauseStateChanged: (callback: (paused: boolean) => void) => void;
      getVersion: () => string;
    };
  }
}
