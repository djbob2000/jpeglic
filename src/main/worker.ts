import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import sharp, { Sharp } from 'sharp';
import { execa, ExecaChildProcess } from 'execa';
import trash from 'trash';
import { InputItem, OutputFormat, ProcessingSettings } from '../common/types';
import { ProcessManager } from './process-manager';

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
  private externalProcess: ExecaChildProcess | null = null;

  constructor(
    private readonly item: InputItem,
    private readonly settings: ProcessingSettings
  ) {}

  async process(): Promise<WorkerResult> {
    if (this.aborted) {
      return { success: false, skipped: false, error: 'Cancelled' };
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
        outputPath: outputInfo.targetPath
      };
    } catch (error) {
      if (this.aborted) {
        return { success: false, skipped: false, error: 'Cancelled' };
      }

      return {
        success: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  cancel(): void {
    this.aborted = true;
    if (this.externalProcess) {
      try {
        this.externalProcess.kill('SIGTERM');
      } catch (error) {
        console.warn('Failed to kill external process', error);
      }
    }
  }

  private async buildPipeline(): Promise<Sharp> {
    const pipeline = sharp(this.item.sourcePath, { failOn: 'truncated' });
    const metadata = await sharp(this.item.sourcePath).metadata();

    await this.applyDownscale(pipeline, metadata.width, metadata.height);

    return pipeline;
  }

  private async applyDownscale(pipeline: Sharp, width?: number, height?: number): Promise<void> {
    const ds = this.settings.downscale;
    if (ds.mode === 'none') {
      return;
    }

    const options = {
      withoutEnlargement: !ds.allowEnlarge,
      kernel: this.getKernel(ds.resampling)
    } as const;

    switch (ds.mode) {
      case 'dimensions':
        if (ds.width || ds.height) {
          pipeline.resize(ds.width, ds.height, options);
        }
        break;
      case 'percentage':
        if (width && height && ds.value) {
          const factor = ds.value / 100;
          pipeline.resize(
            Math.max(1, Math.round(width * factor)),
            Math.max(1, Math.round(height * factor)),
            options
          );
        }
        break;
      case 'longer-side':
        if (ds.value) {
          pipeline.resize(ds.value, ds.value, { ...options, fit: 'inside' });
        }
        break;
      case 'shorter-side':
        if (ds.value) {
          pipeline.resize(ds.value, ds.value, { ...options, fit: 'outside' });
        }
        break;
      case 'megapixels':
        if (width && height && ds.value) {
          const sourcePixels = width * height;
          const targetPixels = ds.value * 1_000_000;
          const factor = Math.sqrt(targetPixels / sourcePixels);

          if (factor < 1 || ds.allowEnlarge) {
            pipeline.resize(
              Math.max(1, Math.round(width * factor)),
              Math.max(1, Math.round(height * factor)),
              options
            );
          }
        }
        break;
    }
  }

  private getKernel(resampling: string): sharp.Kernel {
    switch (resampling) {
      case 'catmullRom':
        return sharp.kernel.cubic;
      case 'mitchell':
        return sharp.kernel.mitchell;
      case 'nearest':
        return sharp.kernel.nearest;
      case 'lanczos3':
      default:
        return sharp.kernel.lanczos3;
    }
  }

  private async export(pipeline: Sharp, targetPath: string): Promise<void> {
    switch (this.settings.output.format) {
      case 'jpeg':
        await pipeline.jpeg({
          quality: this.settings.output.quality,
          mozjpeg: true,
          chromaSubsampling: '4:4:4'
        }).toFile(targetPath);
        break;
      case 'png':
        await pipeline.png({ compressionLevel: 9 }).toFile(targetPath);
        break;
      case 'webp':
        await pipeline.webp({
          quality: this.settings.output.quality,
          lossless: this.settings.output.lossless
        }).toFile(targetPath);
        break;
      case 'avif': {
        const speed = this.mapEffortToSpeed(this.settings.output.effort);
        await pipeline.avif({
          quality: this.settings.output.quality,
          speed,
          lossless: this.settings.output.lossless
        }).toFile(targetPath);
        break;
      }
      case 'jxl':
        await this.exportWithCJXL(pipeline, targetPath);
        break;
      default:
        throw new Error(`Unsupported format: ${this.settings.output.format}`);
      }
    }
  }

  private mapEffortToSpeed(effort: number): number {
    const clamped = Math.max(1, Math.min(9, effort));
    const speed = 10 - clamped;
    return Math.max(0, Math.min(8, speed));
  }

  private async exportWithCJXL(pipeline: Sharp, targetPath: string): Promise<void> {
    const buffer = await pipeline.png({ compressionLevel: 0 }).toBuffer();

    const args = ['-', targetPath];

    if (this.settings.output.lossless) {
      args.push('--lossless_jpeg=1');
    } else {
      args.push('-q', String(this.settings.output.quality));
      args.push('-e', String(this.settings.output.effort));
    }

    this.externalProcess = execa('cjxl', args, { input: buffer });
    ProcessManager.register(this.externalProcess);
    await this.externalProcess;
  }

  private async applyPostProcessing(targetPath: string): Promise<void> {
    if (this.settings.advanced.preserveTimestamps) {
      try {
        const stats = await fs.stat(this.item.sourcePath);
        await fs.utimes(targetPath, stats.atime, stats.mtime);
      } catch (error) {
        console.warn('Failed to copy timestamps', error);
      }
    }
  }

  private async prepareOutputPath(): Promise<PrepareOutputResult | null> {
    const format = this.settings.output.format;
    const ext = this.getExtension(format);

    const baseName = path.basename(this.item.sourcePath, path.extname(this.item.sourcePath));
    const suffix = this.settings.output.suffix ?? '';

    let directory: string;

    if (this.settings.output.destination === 'custom' && this.settings.output.customDirectory) {
      directory = this.settings.output.customDirectory;

      if (this.settings.output.keepFolderStructure) {
        const relativeDir = path.dirname(this.item.relativePath);
        directory = path.resolve(directory, relativeDir === '.' ? '' : relativeDir);
      }
    } else {
      directory = path.dirname(this.item.sourcePath);
    }

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    const targetBase = path.join(directory, `${baseName}${suffix}.${ext}`);

    if (this.settings.output.renameStrategy === 'skip' && existsSync(targetBase)) {
      return null;
    }

    if (this.settings.output.renameStrategy === 'rename') {
      const unique = await this.getUniquePath(directory, `${baseName}${suffix}`, ext);
      return { targetPath: unique };
    }

    return { targetPath: targetBase };
  }

  private getExtension(format: OutputFormat): string {
    switch (format) {
      case 'jpeg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      case 'avif':
        return 'avif';
      case 'jxl':
        return 'jxl';
      default:
        return format;
    }
  }

  private async getUniquePath(directory: string, baseName: string, extension: string): Promise<string> {
    let counter = 1;
    let target = path.join(directory, `${baseName}.${extension}`);

    while (existsSync(target)) {
      target = path.join(directory, `${baseName}_${counter}.${extension}`);
      counter++;
    }

    return target;
  }
}
