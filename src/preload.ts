import { contextBridge, ipcRenderer, webUtils } from "electron";

import type { ElectronAPI } from "./common/types";

const api: ElectronAPI = {
  platform: process.platform,
  isMac: process.platform === "darwin",
  convert: {
    start: (data) => ipcRenderer.invoke("convert:start", data),
    cancel: () => ipcRenderer.invoke("convert:cancel"),
    onProgress: (callback) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on("convert:progress", listener);
      return () => ipcRenderer.removeListener("convert:progress", listener);
    },
    onComplete: (callback) => {
      const listener = (_event: any, result: any) => callback(result);
      ipcRenderer.on("convert:complete", listener);
      return () => ipcRenderer.removeListener("convert:complete", listener);
    },
    onError: (callback) => {
      const listener = (_event: any, error: any) => callback(error);
      ipcRenderer.on("convert:error", listener);
      return () => ipcRenderer.removeListener("convert:error", listener);
    },
  },
  dialog: {
    openFiles: () => ipcRenderer.invoke("dialog:openFiles"),
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    save: (settings) => ipcRenderer.invoke("settings:save", settings),
    reset: () => ipcRenderer.invoke("settings:reset"),
  },
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
  update: {
    check: () => ipcRenderer.invoke("update:check"),
    download: () => ipcRenderer.invoke("update:download"),
    install: () => ipcRenderer.invoke("update:install"),
    onStatus: (callback) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on("update-status", listener);
      return () => ipcRenderer.removeListener("update-status", listener);
    },
  },
  fs: {
    stat: (path) => ipcRenderer.invoke("fs:stat", path),
    readdir: (path) => ipcRenderer.invoke("fs:readdir", path),
    checkProcessed: (path) => ipcRenderer.invoke("fs:checkProcessed", path),
  },
  preview: {
    get: (filePath) => ipcRenderer.invoke("preview:get", filePath),
  },
  utils: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
};

contextBridge.exposeInMainWorld("electron", api);
