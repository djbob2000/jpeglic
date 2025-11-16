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
