import type { ElectronAPI } from "@common/types";

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
