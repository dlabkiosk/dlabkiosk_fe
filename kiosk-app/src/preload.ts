import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kiosk', {
  onCardScanned: (callback: (value: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: string) => {
      callback(value);
    };
    ipcRenderer.on('card:scanned', handler);

    return () => {
      ipcRenderer.removeListener('card:scanned', handler);
    };
  },
});
