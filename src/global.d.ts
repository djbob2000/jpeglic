interface File {
  path: string;
}

interface ElectronAPI {
  platform: NodeJS.Platform;
  isMac: boolean;
  convert: {
    start: (data: any) => Promise<{ success: boolean; error?: string }>;
    cancel: () => Promise<void>;
    onProgress: (callback: (progress: any) => void) => (() => void) | undefined;
    onComplete: (callback: (result: any) => void) => (() => void) | undefined;
    onError: (callback: (error: any) => void) => (() => void) | undefined;
  };
  dialog: {
    openFiles: () => Promise<string[]>;
    openDirectory: () => Promise<string | null>;
  };
  settings: {
    get: () => Promise<any>;
    save: (settings: any) => Promise<void>;
    reset: () => Promise<void>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  update: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    onStatus: (callback: (status: any) => void) => (() => void) | undefined;
  };
  fs: {
    stat: (path: string) => Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtime: number;
    }>;
    readdir: (path: string) => Promise<Array<{
      name: string;
      isFile: boolean;
      isDirectory: boolean;
    }>>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

declare module '*.svg' {
  const src: string;
  export default src;
}
