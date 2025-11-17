import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  convert: {
    start: (data: any) => ipcRenderer.invoke('convert:start', data),
    cancel: () => ipcRenderer.invoke('convert:cancel'),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('convert:progress', listener);
      return () => ipcRenderer.removeListener('convert:progress', listener);
    },
    onComplete: (callback: (result: any) => void) => {
      const listener = (_event: any, result: any) => callback(result);
      ipcRenderer.on('convert:complete', listener);
      return () => ipcRenderer.removeListener('convert:complete', listener);
    },
    onError: (callback: (error: any) => void) => {
      const listener = (_event: any, error: any) => callback(error);
      ipcRenderer.on('convert:error', listener);
      return () => ipcRenderer.removeListener('convert:error', listener);
    }
  },
  dialog: {
    openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: any) => ipcRenderer.invoke('settings:save', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on('update-status', listener);
      return () => ipcRenderer.removeListener('update-status', listener);
    },
  },
  fs: {
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    readdir: (path: string) => ipcRenderer.invoke('fs:readdir', path),
  },
  preview: {
    get: (filePath: string) => ipcRenderer.invoke('preview:get', filePath),
  }
});
