export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl';

export type RenameStrategy = 'overwrite' | 'skip' | 'rename';

export interface DownscaleSettings {
  mode: 'none' | 'dimensions' | 'percentage' | 'longer-side' | 'shorter-side' | 'megapixels';
  width?: number;
  height?: number;
  value?: number;
  allowEnlarge: boolean;
  resampling: 'lanczos3' | 'catmullRom' | 'mitchell' | 'nearest';
}

export interface AdvancedSettings {
  concurrency: number;
  preserveMetadata: boolean;
  preserveTimestamps: boolean;
  deleteOriginals: boolean;
  skipProcessed: boolean;
  playSoundOnFinish: boolean;
  soundVolume: number;
  clearInputAfterConversion: boolean;
}

export interface OutputSettings {
  format: OutputFormat;
  quality: number;
  effort: number;
  lossless: boolean;
  keepAlpha: boolean;
  destination: 'source' | 'custom';
  customDirectory?: string;
  keepFolderStructure: boolean;
  renameStrategy: RenameStrategy;
  suffix: string;
  visuallyLossless: boolean;
}

export interface WindowSettings {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

export interface AppState {
  settings: ProcessingSettings;
  window: WindowSettings;
}

export interface ProcessingSettings {
  output: OutputSettings;
  downscale: DownscaleSettings;
  advanced: AdvancedSettings;
}

export interface InputItem {
  id: string;
  sourcePath: string;
  displayName: string;
  relativePath: string;
  sizeBytes: number;
  lastModified: number;
}

export interface ProcessingRequest {
  items: InputItem[];
  settings: ProcessingSettings;
}

export interface ProcessingProgress {
  completed: number;
  total: number;
  currentItem?: InputItem;
  currentOutputPath?: string;
  message?: string;
}

export interface ProcessingResult {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ item: InputItem; error: string }>;
  canceled: boolean;
}

export interface ElectronAPI {
  platform: NodeJS.Platform;
  isMac: boolean;
  convert: {
    start: (data: ProcessingRequest) => Promise<{ success: boolean; error?: string }>;
    cancel: () => Promise<void>;
    onProgress: (callback: (progress: ProcessingProgress) => void) => () => void;
    onComplete: (callback: (result: ProcessingResult) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
  };
  dialog: {
    openFiles: () => Promise<string[]>;
    openDirectory: () => Promise<string | null>;
  };
  settings: {
    get: () => Promise<unknown>;
    save: (settings: unknown) => Promise<void>;
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
    onStatus: (callback: (status: { event: string; data?: unknown }) => void) => () => void;
  };
  preview: {
    get: (filePath: string) => Promise<{
      data: string;
      metadata: {
        width?: number;
        height?: number;
        format?: string;
        size?: number;
        birthtime?: number;
        exif?: Record<string, any>;
      };
    } | null>;
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
