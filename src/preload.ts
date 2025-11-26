import { contextBridge, ipcRenderer } from 'electron';

export type ClipEntry = {
  id: number;
  content: string;
  timestamp: string;
  pinned: number;
};

contextBridge.exposeInMainWorld('clipstack', {
  getEntries: (query: string) => ipcRenderer.invoke('get-entries', query),
  deleteEntry: (id: number) => ipcRenderer.invoke('delete-entry', id),
  togglePin: (id: number) => ipcRenderer.invoke('toggle-pin', id),
  copyEntry: (content: string) => ipcRenderer.invoke('copy-entry', content),
  clearAll: () => ipcRenderer.invoke('clear-all'),
  onClipboardUpdated: (callback: () => void) => {
    ipcRenderer.on('clipboard-updated', callback);
  }
});

declare global {
  interface Window {
    clipstack: {
      getEntries: (query: string) => Promise<ClipEntry[]>;
      deleteEntry: (id: number) => Promise<void>;
      togglePin: (id: number) => Promise<void>;
      copyEntry: (content: string) => Promise<void>;
      clearAll: () => Promise<void>;
      onClipboardUpdated: (callback: () => void) => void;
    };
  }
}
