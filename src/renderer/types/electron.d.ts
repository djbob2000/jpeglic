import type { ProcessingProgress, ProcessingRequest, ProcessingResult } from "../../common/types";

declare global {
    interface Window {
        electron: {
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
                get: (filePath: string) => Promise<string | null>;
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
        };
    }
}

export {};
