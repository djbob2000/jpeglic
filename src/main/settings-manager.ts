import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { cpus } from "node:os";

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
    visuallyLossless: boolean;
  };
  advanced: {
    concurrency: number;
    preserveMetadata: boolean;
    preserveTimestamps: boolean;
    deleteOriginals: boolean;
    skipProcessed: boolean;
    playSoundOnFinish: boolean;
    soundVolume: number;
    clearInputAfterConversion: boolean;
    warnBeforeReplace: boolean;
  };
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  output: {
    format: "jpeg",
    quality: 90,
    effort: 7,
    lossless: false,
    keepAlpha: false,
    destination: "source",
    keepFolderStructure: true,
    visuallyLossless: true,
  },
  advanced: {
    concurrency: Math.max(1, cpus().length),
    preserveMetadata: true,
    preserveTimestamps: true,
    deleteOriginals: false,
    skipProcessed: true,
    playSoundOnFinish: false,
    soundVolume: 50,
    clearInputAfterConversion: false,
    warnBeforeReplace: true,
  },
  window: {
    width: 900,
    height: 600,
    maximized: false,
  },
};

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(app.getPath("userData"), "config.json");
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        const loaded = JSON.parse(data);
        return this.mergeSettings(DEFAULT_SETTINGS, loaded);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  private mergeSettings(defaults: any, loaded: any): any {
    const result = { ...defaults };
    for (const key in loaded) {
      if (
        loaded[key] !== undefined &&
        loaded[key] !== null &&
        typeof loaded[key] === "object" &&
        !Array.isArray(loaded[key]) &&
        defaults[key]
      ) {
        result[key] = this.mergeSettings(defaults[key], loaded[key]);
      } else if (loaded[key] !== undefined) {
        result[key] = loaded[key];
      }
    }
    return result;
  }

  private saveSettings(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  getAll(): AppSettings {
    return this.settings;
  }

  setAll(settings: Partial<AppSettings>): void {
    this.settings = this.mergeSettings(this.settings, settings);
    this.saveSettings();
  }

  reset(): void {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings();
  }
}
