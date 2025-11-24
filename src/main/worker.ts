import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import * as os from "os";
import sharp, { type Sharp } from "sharp";
import { execa, type ResultPromise } from "execa";
import trash from "trash";
import {
  InputItem,
  OutputFormat,
  ProcessingSettings,
} from "../common/types.js";
import { ProcessManager } from "./process-manager.js";

export interface WorkerResult {
  success: boolean;
  skipped: boolean;
  error?: string;
  outputPath?: string;
}

interface PrepareOutputResult {
  targetPath: string;
}

export class Worker {
  private aborted = false;
  private externalProcess: ResultPromise | null = null;

  constructor(
    private readonly item: InputItem,
    private readonly settings: ProcessingSettings
  ) {}

  async process(): Promise<WorkerResult> {
    if (this.aborted) {
      return { success: false, skipped: false, error: "Cancelled" };
    }

    try {
      const outputInfo = await this.prepareOutputPath();
      if (!outputInfo) {
        return { success: false, skipped: true };
      }

      const pipeline = await this.buildPipeline();

      if (this.settings.advanced.preserveMetadata) {
        pipeline.withMetadata();
      }

      if (!this.settings.output.keepAlpha) {
        pipeline.removeAlpha();
      }

      await this.export(pipeline, outputInfo.targetPath);
      await this.applyPostProcessing(outputInfo.targetPath);

      if (this.settings.advanced.deleteOriginals) {
        await trash([this.item.sourcePath]);
      }

      return {
        success: true,
        skipped: false,
        outputPath: outputInfo.targetPath,
      };
    } catch (error) {
      if (this.aborted) {
        return { success: false, skipped: false, error: "Cancelled" };
      }

      return {
        success: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  cancel(): void {
    this.aborted = true;
    if (this.externalProcess) {
      try {
        this.externalProcess.kill("SIGTERM");
      } catch (error) {
        console.warn("Failed to kill external process", error);
      }
    }
  }

  private async buildPipeline(): Promise<Sharp> {
    const pipeline = sharp(this.item.sourcePath, { failOn: "truncated" });
    // Downscale logic removed
    return pipeline;
  }

  private async export(pipeline: Sharp, targetPath: string): Promise<void> {
    switch (this.settings.output.format) {
      case "jpeg":
        await this.exportWithJpegli(pipeline, targetPath);
        break;
      case "png":
        await pipeline.png({ compressionLevel: 9 }).toFile(targetPath);
        break;
      case "webp":
        await pipeline
          .webp({
            quality: this.settings.output.quality,
            lossless: this.settings.output.lossless,
          })
          .toFile(targetPath);
        break;
      case "avif": {
        const effort = this.normalizeEffort(this.settings.output.effort);
        await pipeline
          .avif({
            quality: this.settings.output.quality,
            effort,
            lossless: this.settings.output.lossless,
          })
          .toFile(targetPath);
        break;
      }
      case "jxl":
        await this.exportWithCJXL(pipeline, targetPath);
        break;
      default:
        throw new Error(`Unsupported format: ${this.settings.output.format}`);
    }
  }

  private normalizeEffort(effort: number): number {
    return Math.max(0, Math.min(9, Math.round(effort)));
  }

  private async exportWithJpegli(
    pipeline: Sharp,
    targetPath: string
  ): Promise<void> {
    const bin = this.resolveBinary("cjpegli");

    if (!bin) {
      throw new Error("cjpegli binary not found");
    }

    const { data, info } = await pipeline
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ppmHeader = `P6\n${info.width} ${info.height}\n255\n`;
    const ppmBuffer = Buffer.concat([Buffer.from(ppmHeader), data]);

    const args: string[] = ["-", targetPath];

    if (this.settings.output.visuallyLossless) {
      args.push("-d", "1");
      args.push("--chroma_subsampling", "420");
      args.push("-p", "2");
    } else {
      args.push("-q", String(this.settings.output.quality));
      args.push("-p", "2");
    }

    try {
      this.externalProcess = execa(bin, args, { input: ppmBuffer });
      ProcessManager.register(this.externalProcess as any);
      await this.externalProcess;
    } catch (error) {
      console.error("Jpegli conversion failed:", error);
      throw error;
    }
  }

  private async exportWithCJXL(
    pipeline: Sharp,
    targetPath: string
  ): Promise<void> {
    const buffer = await pipeline.png({ compressionLevel: 0 }).toBuffer();

    const args = ["-", targetPath];

    if (this.settings.output.lossless) {
      args.push("--lossless_jpeg=1");
    } else {
      args.push("-q", String(this.settings.output.quality));
      args.push("-e", String(this.settings.output.effort));
    }

    this.externalProcess = execa("cjxl", args, { input: buffer });
    ProcessManager.register(this.externalProcess as any);
    await this.externalProcess;
  }

  private async isAlreadyProcessed(filePath: string): Promise<boolean> {
    try {
      const { exiftool } = await import("exiftool-vendored");
      const tags: any = await exiftool.read(filePath);

      // Check standard XMP tags
      const creatorTool = tags["CreatorTool"];
      const label = tags["Label"];

      return creatorTool === "HomeArchiveConverter" || label === "Processed";
    } catch {
      return false;
    }
  }

  private async applyPostProcessing(targetPath: string): Promise<void> {
    // Only JPEG supports XMP here
    if (this.settings.output.format === "jpeg") {
      try {
        const { exiftool } = await import("exiftool-vendored");

        // Write standard XMP tags
        await (exiftool as any).write(targetPath, {
          "XMP:CreatorTool": "HomeArchiveConverter",
          "XMP:Label": "Processed",
        });
      } catch (error) {
        console.warn("Failed to write XMP metadata", error);
      }
    }

    // Preserve timestamps
    if (this.settings.advanced.preserveTimestamps) {
      try {
        const stats = await fs.stat(this.item.sourcePath);
        await fs.utimes(targetPath, stats.atime, stats.mtime);
      } catch (error) {
        console.warn("Failed to copy timestamps", error);
      }
    }
  }

  private async prepareOutputPath(): Promise<PrepareOutputResult | null> {
    // Check if SOURCE file is already processed if skipProcessed is enabled
    // This happens when user drops an already converted file back into the app
    // Only check when destination is "source" (replace mode), not "custom"
    if (
      this.settings.advanced.skipProcessed &&
      this.settings.output.destination === "source"
    ) {
      const processed = await this.isAlreadyProcessed(this.item.sourcePath);
      if (processed) {
        return null;
      }
    }

    const format = this.settings.output.format;
    const ext = this.getExtension(format);

    const baseName = path.basename(
      this.item.sourcePath,
      path.extname(this.item.sourcePath)
    );

    let directory: string;

    if (
      this.settings.output.destination === "custom" &&
      this.settings.output.customDirectory
    ) {
      directory = this.settings.output.customDirectory;

      if (this.settings.output.keepFolderStructure) {
        const relativeDir = path.dirname(this.item.relativePath);
        directory = path.resolve(
          directory,
          relativeDir === "." ? "" : relativeDir
        );
      }
    } else {
      directory = path.dirname(this.item.sourcePath);
    }

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    const targetPath = path.join(directory, `${baseName}.${ext}`);

    return { targetPath };
  }

  private getExtension(format: OutputFormat): string {
    switch (format) {
      case "jpeg":
        return "jpg";
      case "png":
        return "png";
      case "webp":
        return "webp";
      case "avif":
        return "avif";
      case "jxl":
        return "jxl";
      default:
        return format;
    }
  }

  private resolveBinary(name: string): string | null {
    const isWin = process.platform === "win32";
    const exe = isWin ? `${name}.exe` : name;
    const platformDir =
      process.platform === "darwin" ? "mac" : isWin ? "win" : "linux";
    const envPath = process.env.CJEGLI_PATH;
    if (envPath && existsSync(envPath)) return envPath;
    const candidates: string[] = [];
    const res = (process as any).resourcesPath as string | undefined;
    if (res) candidates.push(path.join(res, "binaries", platformDir, exe));
    candidates.push(
      path.join(__dirname, "..", "..", "binaries", platformDir, exe)
    );
    const pathVar = process.env.PATH || "";
    for (const dir of pathVar.split(path.delimiter)) {
      if (!dir) continue;
      candidates.push(path.join(dir, exe));
    }
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return null;
  }
}
