import type { ProcessingSettings } from "@common/types";

export const defaultSettings: ProcessingSettings = {
  output: {
    format: "jpeg",
    quality: 90, // Ignored when visuallyLossless is true, but good to have a safe default
    effort: 7,
    lossless: false,
    keepAlpha: false, // JPEG doesn't support alpha
    destination: "source",
    customDirectory: undefined,
    keepFolderStructure: true,
    visuallyLossless: true,
    cjpegliDistance: 1.0,
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
};
