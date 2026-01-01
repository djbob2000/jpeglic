import type { AppSettings } from "@common/types";

export const defaultSettings: AppSettings = {
  output: {
    format: "jpeg",
    keepAlpha: false, // JPEG doesn't support alpha
    destination: "source",
    customDirectory: undefined,
    keepFolderStructure: true,
    visuallyLossless: false,
    cjpegliDistance: 3.0,
  },
  advanced: {
    concurrency: 4,
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
    width: 1000,
    height: 800,
    maximized: false,
  },
};
