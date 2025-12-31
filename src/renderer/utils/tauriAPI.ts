import type {
	AppSettings,
	DirEntry,
	FileStats,
	PreviewData,
	ProcessedStatus,
	ProcessingProgress,
	ProcessingRequest,
	ProcessingResult,
} from "@common/types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Tauri API Bridge
export const tauriAPI = {
	platform: navigator.platform,
	isMac:
		navigator.platform.toLowerCase().includes("mac") ||
		navigator.userAgent.toLowerCase().includes("mac"),
	convertFileSrc,

	convert: {
		start: (data: ProcessingRequest) =>
			invoke<ProcessingResult>("start_conversion", { request: data }),

		cancel: () => invoke("cancel_conversion"),

		onProgress: (callback: (progress: ProcessingProgress) => void): (() => void) => {
			let unlisten: UnlistenFn | null = null;

			listen<ProcessingProgress>("convert:progress", (event) => {
				callback(event.payload);
			}).then((fn) => {
				unlisten = fn;
			});

			return () => {
				if (unlisten) unlisten();
			};
		},

		onComplete: (callback: (result: ProcessingResult) => void): (() => void) => {
			let unlisten: UnlistenFn | null = null;

			listen<ProcessingResult>("convert:complete", (event) => {
				callback(event.payload);
			}).then((fn) => {
				unlisten = fn;
			});

			return () => {
				if (unlisten) unlisten();
			};
		},

		onError: (callback: (error: { message: string }) => void): (() => void) => {
			let unlisten: UnlistenFn | null = null;

			listen<{ message: string }>("convert:error", (event) => {
				callback(event.payload);
			}).then((fn) => {
				unlisten = fn;
			});

			return () => {
				if (unlisten) unlisten();
			};
		},
	},

	dialog: {
		openFiles: () => invoke<string[]>("open_files"),

		openDirectory: () => invoke<string | null>("open_directory"),
	},

	settings: {
		get: () => invoke<AppSettings>("get_settings"),

		save: (settings: Partial<AppSettings>) => invoke("save_settings", { settings }),

		reset: () => invoke("reset_settings"),
	},

	window: {
		minimize: () => invoke("minimize_window"),

		maximize: () => invoke("maximize_window"),

		close: () => invoke("close_window"),

		setProgressBar: (progress: number) => invoke("set_progress_bar", { progress }),

		startDragging: () => getCurrentWindow().startDragging(),
	},

	fs: {
		stat: (path: string) => invoke<FileStats>("stat_file", { path }),

		readdir: (path: string) => invoke<DirEntry[]>("read_directory", { path }),

		checkProcessed: (path: string) => invoke<boolean>("check_processed", { filePath: path }),

		checkProcessedBatch: (paths: string[]) =>
			invoke<ProcessedStatus[]>("check_processed_batch", { filePaths: paths }),
	},

	preview: {
		get: (filePath: string) => invoke<PreviewData>("get_preview", { filePath }),
	},

	utils: {
		getPathForFile: (file: File) => {
			// In Tauri, the File object may have a path property
			// @ts-expect-error - path is not in standard File interface but Tauri adds it
			if (file.path) {
				// @ts-expect-error
				return file.path as string;
			}
			// Fallback: try to get from webkitRelativePath
			if (file.webkitRelativePath) {
				return file.webkitRelativePath;
			}
			return "";
		},

		onFileDrop: (callback: (paths: string[]) => void): (() => void) => {
			let unlisten: UnlistenFn | null = null;

			getCurrentWindow()
				.onDragDropEvent((event) => {
					if (event.payload.type === "drop") {
						callback(event.payload.paths);
					}
				})
				.then((fn) => {
					unlisten = fn;
				});

			return () => {
				if (unlisten) unlisten();
			};
		},
	},
};

// Make it available globally
declare global {
	interface Window {
		__TAURI_API__: typeof tauriAPI;
	}
}

if (typeof window !== "undefined") {
	window.__TAURI_API__ = tauriAPI;
}

export default tauriAPI;
