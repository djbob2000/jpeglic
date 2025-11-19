import type { ProcessingSettings } from "../../common/types";

export const defaultSettings: ProcessingSettings = {
	output: {
		format: "jxl",
		quality: 90,
		effort: 7,
		lossless: false,
		keepAlpha: true,
		destination: "source",
		customDirectory: undefined,
		keepFolderStructure: true,
		renameStrategy: "skip",
		suffix: "",
		visuallyLossless: false,
	},
	downscale: {
		mode: "none",
		width: undefined,
		height: undefined,
		value: undefined,
		allowEnlarge: false,
		resampling: "lanczos3",
	},
	advanced: {
		concurrency: 4,
		preserveMetadata: true,
		preserveTimestamps: true,
		deleteOriginals: false,
		skipProcessed: false,
		playSoundOnFinish: true,
		soundVolume: 50,
		clearInputAfterConversion: true,
	},
};
