export type OutputFormat = "jpeg";

export interface ProcessedStatus {
  path: string;
  isProcessed: boolean;
}

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface DirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
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
  warnBeforeReplace: boolean;
}

export interface OutputSettings {
  format: OutputFormat;
  quality: number;
  effort: number;
  lossless: boolean;
  keepAlpha: boolean;
  destination: "source" | "custom";
  customDirectory?: string;
  keepFolderStructure: boolean;
  visuallyLossless: boolean;
  cjpegliDistance: number;
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
  advanced: AdvancedSettings;
}

export interface InputItem {
  id: string;
  sourcePath: string;
  displayName: string;
  relativePath: string;
  sizeBytes: number;
  lastModified: number;
  isProcessed?: boolean;
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
  processedItemId?: string; // ID of item that was just processed (success or skipped)
  savedBytes?: number; // Total bytes saved so far
  activeItemIds?: string[];
}

export interface ProcessingResult {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ item: InputItem; error: string }>;
  canceled: boolean;
  savedBytes: number;
}

export interface PreviewMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  birthtime?: number;
  exif?: Record<string, unknown>;
}

export interface PreviewData {
  url: string;
  metadata: PreviewMetadata;
}

export interface AppSettings {
  output: OutputSettings;
  advanced: AdvancedSettings;
  window: WindowSettings;
}


