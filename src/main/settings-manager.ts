import Store from 'electron-store';

export interface AppSettings {
  output: {
    format: string;
    quality: number;
    effort: number;
    lossless: boolean;
    keepAlpha: boolean;
    destination: string;
    customDirectory?: string;
    keepFolderStructure: boolean;
    renameStrategy: string;
    suffix: string;
  };
  downscale: {
    mode: string;
    width?: number;
    height?: number;
    value?: number;
    allowEnlarge: boolean;
    resampling: string;
  };
  advanced: {
    concurrency: number;
    preserveMetadata: boolean;
    preserveTimestamps: boolean;
    deleteOriginals: boolean;
    playSoundOnFinish: boolean;
    soundVolume: number;
    clearInputAfterConversion: boolean;
  };
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
}

const schema: Store.Schema<AppSettings> = {
  output: {
    type: 'object',
    properties: {
      format: { type: 'string', default: 'jxl' },
      quality: { type: 'number', default: 90 },
      effort: { type: 'number', default: 7 },
      lossless: { type: 'boolean', default: false },
      keepAlpha: { type: 'boolean', default: true },
      destination: { type: 'string', default: 'source' },
      customDirectory: { type: 'string' },
      keepFolderStructure: { type: 'boolean', default: true },
      renameStrategy: { type: 'string', default: 'skip' },
      suffix: { type: 'string', default: '' },
    },
    default: {
      format: 'jxl',
      quality: 90,
      effort: 7,
      lossless: false,
      keepAlpha: true,
      destination: 'source',
      keepFolderStructure: true,
      renameStrategy: 'skip',
      suffix: '',
    },
  },
  downscale: {
    type: 'object',
    properties: {
      mode: { type: 'string', default: 'none' },
      width: { type: 'number' },
      height: { type: 'number' },
      value: { type: 'number' },
      allowEnlarge: { type: 'boolean', default: false },
      resampling: { type: 'string', default: 'lanczos3' },
    },
    default: {
      mode: 'none',
      allowEnlarge: false,
      resampling: 'lanczos3',
    },
  },
  advanced: {
    type: 'object',
    properties: {
      concurrency: { type: 'number', default: 4 },
      preserveMetadata: { type: 'boolean', default: true },
      preserveTimestamps: { type: 'boolean', default: true },
      deleteOriginals: { type: 'boolean', default: false },
      playSoundOnFinish: { type: 'boolean', default: true },
      soundVolume: { type: 'number', default: 50 },
      clearInputAfterConversion: { type: 'boolean', default: true },
    },
    default: {
      concurrency: 4,
      preserveMetadata: true,
      preserveTimestamps: true,
      deleteOriginals: false,
      playSoundOnFinish: true,
      soundVolume: 50,
      clearInputAfterConversion: true,
    },
  },
  window: {
    type: 'object',
    properties: {
      width: { type: 'number', default: 900 },
      height: { type: 'number', default: 600 },
      x: { type: 'number' },
      y: { type: 'number' },
      maximized: { type: 'boolean', default: false },
    },
    default: {
      width: 900,
      height: 600,
      maximized: false,
    },
  },
};

export class SettingsManager {
  private static instance: SettingsManager;
  private store: Store<AppSettings>;

  private constructor() {
    this.store = new Store<AppSettings>({
      name: 'config',
      schema,
    });
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  getAll(): AppSettings {
    return this.store.store;
  }

  setAll(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        this.store.set(key as keyof AppSettings, value as any);
      }
    });
  }

  reset(): void {
    this.store.clear();
  }
}
