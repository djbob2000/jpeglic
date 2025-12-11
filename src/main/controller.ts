import { BrowserWindow } from "electron";
import { Worker } from "./worker.js";
import {
  ProcessingRequest,
  ProcessingProgress,
  ProcessingResult,
  InputItem,
} from "../common/types.js";

export class Controller {
  private workers: Worker[] = [];
  private cancelRequested = false;

  constructor(private window: BrowserWindow) {}

  async startProcessing(request: ProcessingRequest): Promise<ProcessingResult> {
    this.cancelRequested = false;

    const result: ProcessingResult = {
      successCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      canceled: false,
      savedBytes: 0,
    };

    const concurrency = Math.max(1, request.settings.advanced.concurrency || 1);
    const items = [...request.items];
    let completed = 0;
    let totalSavedBytes = 0;

    const processQueue = async () => {
      while (items.length > 0 && !this.cancelRequested) {
        const item = items.shift()!;

        this.sendProgress({
          completed,
          total: request.items.length,
          currentItem: item,
          message: `Converting ${item.displayName}...`,
          savedBytes: totalSavedBytes,
        });

        const worker = new Worker(item, request.settings);
        this.workers.push(worker);

        try {
          const workerResult = await worker.process();

          if (workerResult.success) {
            result.successCount++;
            if (workerResult.savedBytes) {
              totalSavedBytes += workerResult.savedBytes;
              result.savedBytes = totalSavedBytes;
            }
          } else if (workerResult.skipped) {
            result.skippedCount++;
          } else {
            result.failedCount++;
            result.errors.push({
              item,
              error: workerResult.error || "Unknown error",
            });
          }

          completed++;
          this.sendProgress({
            completed,
            total: request.items.length,
            currentItem: item,
            processedItemId: item.id,
            savedBytes: totalSavedBytes,
          });
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            item,
            error: error instanceof Error ? error.message : String(error),
          });
          completed++;
          this.sendProgress({
            completed,
            total: request.items.length,
            processedItemId: item.id,
            savedBytes: totalSavedBytes,
          });
        } finally {
          this.workers = this.workers.filter((w) => w !== worker);
        }
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(processQueue());
    }

    await Promise.all(promises);

    if (this.cancelRequested) {
      result.canceled = true;
    }

    this.window.webContents.send("convert:complete", result);
    return result;
  }

  cancel(): void {
    this.cancelRequested = true;
    this.workers.forEach((worker) => worker.cancel());
    this.workers = [];
  }

  private sendProgress(progress: ProcessingProgress): void {
    this.window.webContents.send("convert:progress", progress);
  }
}
