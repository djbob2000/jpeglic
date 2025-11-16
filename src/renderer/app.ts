import * as fs from 'fs';
import * as path from 'path';
import { InputItem, ProcessingRequest, ProcessingProgress, ProcessingResult, ProcessingSettings } from '../common/types';

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
        get: () => Promise<any>;
        save: (settings: any) => Promise<void>;
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
        onStatus: (callback: (status: { event: string; data?: any }) => void) => () => void;
      };
    };
  }
}

class App {
  private inputItems: InputItem[] = [];
  private commonBase: string | null = null;
  private unsubscribeProgress: (() => void) | null = null;
  private unsubscribeComplete: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;
  private cachedSettings: ProcessingSettings | null = null;

  constructor() {
    this.initTitlebar();
    this.initTabs();
    this.initInputTab();
    this.initOutputTab();
    this.initModifyTab();
    this.initSettingsTab();
    this.initProgressModal();
    this.loadSettings();
    this.setupAutoSave();
    this.setupUpdateHandlers();
  }

  private initTabs(): void {
    document.querySelectorAll<HTMLButtonElement>('.tab-button').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  }

  private switchTab(tab: string): void {
    document.querySelectorAll<HTMLButtonElement>('.tab-button').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });

    document.querySelectorAll<HTMLDivElement>('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `${tab}-tab`);
    });
  }

  private initInputTab(): void {
    const dropZone = document.getElementById('drop-zone');
    const addFilesBtn = document.getElementById('add-files-btn');
    const clearBtn = document.getElementById('clear-btn');
    const convertBtn = document.getElementById('convert-btn');

    if (!dropZone || !addFilesBtn || !clearBtn || !convertBtn) {
      return;
    }

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');

      const files = Array.from(event.dataTransfer?.files ?? []);
      const paths = files.map((file) => file.path).filter(Boolean);
      await this.addFiles(paths);
    });

    addFilesBtn.addEventListener('click', async () => {
      const paths = await window.electron.dialog.openFiles();
      await this.addFiles(paths);
    });

    clearBtn.addEventListener('click', () => {
      this.inputItems = [];
      this.commonBase = null;
      this.renderFileList();
    });

    convertBtn.addEventListener('click', () => this.startConversion());
  }

  private initOutputTab(): void {
    const qualitySlider = document.getElementById('quality-slider') as HTMLInputElement | null;
    const qualityValue = document.getElementById('quality-value');
    const effortSlider = document.getElementById('effort-slider') as HTMLInputElement | null;
    const effortValue = document.getElementById('effort-value');
    const destinationRadios = document.querySelectorAll<HTMLInputElement>('input[name="destination"]');
    const customDirInput = document.getElementById('custom-dir-input') as HTMLInputElement | null;
    const browseDirBtn = document.getElementById('browse-dir-btn');
    const convertBtn = document.getElementById('output-convert-btn');

    if (qualitySlider && qualityValue) {
      qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
      });
    }

    if (effortSlider && effortValue) {
      effortSlider.addEventListener('input', () => {
        effortValue.textContent = effortSlider.value;
      });
    }

    destinationRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!customDirInput || !browseDirBtn) return;
        const isCustom = radio.value === 'custom' && radio.checked;
        customDirInput.disabled = !isCustom;
        browseDirBtn.toggleAttribute('disabled', !isCustom);
      });
    });

    if (browseDirBtn && customDirInput) {
      browseDirBtn.addEventListener('click', async () => {
        const dir = await window.electron.dialog.openDirectory();
        if (dir) {
          customDirInput.value = dir;
        }
      });
    }

    convertBtn?.addEventListener('click', () => this.startConversion());
  }

  private initModifyTab(): void {
    const modeSelect = document.getElementById('downscale-mode') as HTMLSelectElement | null;
    const dimensionsInputs = document.getElementById('dimensions-inputs');
    const valueInput = document.getElementById('value-input');
    const convertBtn = document.getElementById('modify-convert-btn');

    if (!modeSelect || !dimensionsInputs || !valueInput) {
      return;
    }

    const updateVisibility = () => {
      dimensionsInputs.style.display = modeSelect.value === 'dimensions' ? 'block' : 'none';
      valueInput.style.display = ['percentage', 'longer-side', 'shorter-side', 'megapixels'].includes(modeSelect.value)
        ? 'block'
        : 'none';
    };

    modeSelect.addEventListener('change', updateVisibility);
    updateVisibility();

    convertBtn?.addEventListener('click', () => this.startConversion());
  }

  private initSettingsTab(): void {
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement | null;
    const volumeValue = document.getElementById('volume-value');

    if (volumeSlider && volumeValue) {
      volumeSlider.addEventListener('input', () => {
        volumeValue.textContent = volumeSlider.value;
      });
    }
  }

  private initProgressModal(): void {
    const cancelBtn = document.getElementById('cancel-btn');

    cancelBtn?.addEventListener('click', () => window.electron.convert.cancel());

    this.unsubscribeProgress = window.electron.convert.onProgress((progress) => {
      this.updateProgress(progress);
    });

    this.unsubscribeComplete = window.electron.convert.onComplete((result) => {
      this.hideProgressModal();
      this.showResult(result);
    });

    this.unsubscribeError = window.electron.convert.onError((error) => {
      this.hideProgressModal();
      this.showError(error.message);
    });
  }

  private async addFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }

    let base = this.commonBase;
    for (const filePath of paths) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const directoryFiles = this.collectFilesRecursively(filePath);
        await this.addFiles(directoryFiles);
        continue;
      }

      const parentDir = path.dirname(filePath);
      base = base ? this.getCommonBase(base, parentDir) : parentDir;
    }

    this.commonBase = base;

    const existingPaths = new Set(this.inputItems.map((item) => item.sourcePath));

    for (const filePath of paths) {
      if (existingPaths.has(filePath)) {
        continue;
      }

      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        continue;
      }

      const relativePath = this.commonBase
        ? path.relative(this.commonBase, filePath)
        : path.basename(filePath);

      this.inputItems.push({
        id: this.generateId(),
        sourcePath: filePath,
        displayName: path.basename(filePath),
        relativePath,
        sizeBytes: stat.size,
        lastModified: stat.mtime.getTime()
      });
    }

    this.recalculateRelativePaths();
    this.renderFileList();
  }

  private collectFilesRecursively(directory: string): string[] {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.collectFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getCommonBase(a: string, b: string): string {
    const partsA = a.split(path.sep).filter(Boolean);
    const partsB = b.split(path.sep).filter(Boolean);
    const length = Math.min(partsA.length, partsB.length);
    const common: string[] = [];

    for (let i = 0; i < length; i++) {
      if (partsA[i] === partsB[i]) {
        common.push(partsA[i]);
      } else {
        break;
      }
    }

    if (common.length === 0) {
      return process.platform === 'win32' ? path.parse(a).root : '/';
    }

    const firstA = path.parse(a).root;
    return path.join(firstA, ...common);
  }

  private recalculateRelativePaths(): void {
    if (!this.commonBase) {
      return;
    }

    this.inputItems = this.inputItems.map((item) => ({
      ...item,
      relativePath: path.relative(this.commonBase!, item.sourcePath)
    }));
  }

  private renderFileList(): void {
    const container = document.getElementById('file-list');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (this.inputItems.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'No files added yet';
      placeholder.style.cssText = 'text-align:center; color:#6b7280; padding:20px;';
      container.appendChild(placeholder);
      return;
    }

    this.inputItems.forEach((item) => {
      const element = document.createElement('div');
      element.className = 'file-item';
      element.innerHTML = `
        <div class="file-info">
          <div class="file-name">${item.displayName}</div>
          <div class="file-details">${item.relativePath} — ${this.formatSize(item.sizeBytes)}</div>
        </div>
        <button class="file-remove" data-id="${item.id}">Remove</button>
      `;

      element.querySelector<HTMLButtonElement>('.file-remove')?.addEventListener('click', () => {
        this.inputItems = this.inputItems.filter((target) => target.id !== item.id);
        if (this.inputItems.length === 0) {
          this.commonBase = null;
        } else {
          this.recalculateRelativePaths();
        }
        this.renderFileList();
      });

      container.appendChild(element);
    });
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, index);
    return `${size.toFixed(1)} ${units[index]}`;
  }

  private getSettings(): ProcessingSettings {
    const format = (document.querySelector('input[name="format"]:checked') as HTMLInputElement)?.value ?? 'jxl';
    const quality = Number((document.getElementById('quality-slider') as HTMLInputElement)?.value ?? 90);
    const effort = Number((document.getElementById('effort-slider') as HTMLInputElement)?.value ?? 7);
    const lossless = Boolean((document.getElementById('lossless-check') as HTMLInputElement)?.checked);
    const keepAlpha = Boolean((document.getElementById('keep-alpha-check') as HTMLInputElement)?.checked);
    const destination = (document.querySelector('input[name="destination"]:checked') as HTMLInputElement)?.value ?? 'source';
    const customDirectory = (document.getElementById('custom-dir-input') as HTMLInputElement)?.value;
    const keepStructure = Boolean((document.getElementById('keep-structure-check') as HTMLInputElement)?.checked);
    const renameStrategy = (document.querySelector('input[name="rename"]:checked') as HTMLInputElement)?.value ?? 'skip';
    const suffix = (document.getElementById('suffix-input') as HTMLInputElement)?.value ?? '';

    const downscaleMode = (document.getElementById('downscale-mode') as HTMLSelectElement)?.value ?? 'none';
    const width = Number((document.getElementById('width-input') as HTMLInputElement)?.value ?? 0) || undefined;
    const height = Number((document.getElementById('height-input') as HTMLInputElement)?.value ?? 0) || undefined;
    const value = Number((document.getElementById('downscale-value') as HTMLInputElement)?.value ?? 0) || undefined;
    const allowEnlarge = Boolean((document.getElementById('allow-enlarge-check') as HTMLInputElement)?.checked);
    const resampling = (document.getElementById('resampling-select') as HTMLSelectElement)?.value ?? 'lanczos3';

    const concurrency = Math.max(1, Number((document.getElementById('concurrency-input') as HTMLInputElement)?.value ?? 4));
    const preserveMetadata = Boolean((document.getElementById('preserve-metadata-check') as HTMLInputElement)?.checked);
    const preserveTimestamps = Boolean((document.getElementById('preserve-timestamps-check') as HTMLInputElement)?.checked);
    const deleteOriginals = Boolean((document.getElementById('delete-originals-check') as HTMLInputElement)?.checked);
    const playSoundOnFinish = Boolean((document.getElementById('play-sound-check') as HTMLInputElement)?.checked);
    const soundVolume = Number((document.getElementById('volume-slider') as HTMLInputElement)?.value ?? 50);
    const clearInputAfterConversion = Boolean((document.getElementById('clear-input-check') as HTMLInputElement)?.checked);

    return {
      output: {
        format: format as ProcessingSettings['output']['format'],
        quality,
        effort,
        lossless,
        keepAlpha,
        destination: destination as ProcessingSettings['output']['destination'],
        customDirectory: destination === 'custom' ? customDirectory : undefined,
        keepFolderStructure: keepStructure,
        renameStrategy: renameStrategy as ProcessingSettings['output']['renameStrategy'],
        suffix
      },
      downscale: {
        mode: downscaleMode as ProcessingSettings['downscale']['mode'],
        width: downscaleMode === 'dimensions' ? width : undefined,
        height: downscaleMode === 'dimensions' ? height : undefined,
        value: ['percentage', 'longer-side', 'shorter-side', 'megapixels'].includes(downscaleMode) ? value : undefined,
        allowEnlarge,
        resampling: resampling as ProcessingSettings['downscale']['resampling']
      },
      advanced: {
        concurrency,
        preserveMetadata,
        preserveTimestamps,
        deleteOriginals,
        playSoundOnFinish,
        soundVolume,
        clearInputAfterConversion
      }
    };
  }

  private async startConversion(): Promise<void> {
    if (this.inputItems.length === 0) {
      this.showError('Add files before starting conversion.');
      return;
    }

    const settings = this.getSettings();
    const request: ProcessingRequest = {
      items: this.inputItems,
      settings
    };

    this.showProgressModal();

    const response = await window.electron.convert.start(request);
    if (!response.success && response.error) {
      this.hideProgressModal();
      this.showError(response.error);
    }
  }

  private showProgressModal(): void {
    const modal = document.getElementById('progress-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.updateProgress({ completed: 0, total: this.inputItems.length });
    }
  }

  private hideProgressModal(): void {
    const modal = document.getElementById('progress-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private updateProgress(progress: ProcessingProgress): void {
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const status = document.getElementById('progress-status');

    if (!fill || !text || !status) {
      return;
    }

    const percentage = progress.total === 0 ? 0 : Math.min(100, (progress.completed / progress.total) * 100);
    fill.style.width = `${percentage}%`;
    text.textContent = `${Math.min(progress.completed, progress.total)} / ${progress.total}`;

    if (progress.message) {
      status.textContent = progress.message;
    } else if (progress.currentItem) {
      status.textContent = `Processing ${progress.currentItem.displayName}`;
    } else {
      status.textContent = '';
    }
  }

  private showResult(result: ProcessingResult): void {
    if (result.canceled) {
      window.alert('Conversion was canceled.');
      return;
    }

    const settings = this.getSettings();

    if (settings.advanced.playSoundOnFinish) {
      this.playNotification(settings.advanced.soundVolume);
    }

    const messageLines = [
      'Conversion finished!',
      `Successful: ${result.successCount}`,
      `Skipped: ${result.skippedCount}`,
      `Failed: ${result.failedCount}`
    ];

    if (result.errors.length > 0) {
      messageLines.push('', 'Errors:');
      result.errors.slice(0, 5).forEach((entry) => {
        messageLines.push(`• ${entry.item.displayName}: ${entry.error}`);
      });
      if (result.errors.length > 5) {
        messageLines.push(`...and ${result.errors.length - 5} more`);
      }
    }

    window.alert(messageLines.join('\n'));

    if (settings.advanced.clearInputAfterConversion && result.successCount > 0) {
      this.inputItems = [];
      this.commonBase = null;
      this.renderFileList();
    }
  }

  private showError(message: string): void {
    window.alert(message);
  }

  private playNotification(volume: number): void {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const gain = Math.max(0, Math.min(1, volume / 100));
      gainNode.gain.value = gain * 0.3;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      oscillator.onended = () => {
        audioContext.close().catch(() => undefined);
      };
    } catch (error) {
      console.warn('Failed to play notification sound', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private initTitlebar(): void {
    const minimizeBtn = document.getElementById('window-minimize');
    const maximizeBtn = document.getElementById('window-maximize');
    const closeBtn = document.getElementById('window-close');

    minimizeBtn?.addEventListener('click', () => {
      window.electron.window.minimize();
    });

    maximizeBtn?.addEventListener('click', () => {
      window.electron.window.maximize();
    });

    closeBtn?.addEventListener('click', () => {
      window.electron.window.close();
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await window.electron.settings.get();
      
      if (settings?.output) {
        this.applySettings(settings);
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  }

  private applySettings(settings: any): void {
    if (!settings) return;

    const { output, downscale, advanced } = settings;

    if (output) {
      const formatRadio = document.querySelector(`input[name="format"][value="${output.format}"]`) as HTMLInputElement;
      if (formatRadio) formatRadio.checked = true;

      const qualitySlider = document.getElementById('quality-slider') as HTMLInputElement;
      if (qualitySlider) qualitySlider.value = String(output.quality);
      
      const qualityValue = document.getElementById('quality-value');
      if (qualityValue) qualityValue.textContent = String(output.quality);

      const effortSlider = document.getElementById('effort-slider') as HTMLInputElement;
      if (effortSlider) effortSlider.value = String(output.effort);
      
      const effortValue = document.getElementById('effort-value');
      if (effortValue) effortValue.textContent = String(output.effort);
    }

    if (downscale) {
      const modeSelect = document.getElementById('downscale-mode') as HTMLSelectElement;
      if (modeSelect) modeSelect.value = downscale.mode;
    }

    if (advanced) {
      const concurrencyInput = document.getElementById('concurrency-input') as HTMLInputElement;
      if (concurrencyInput) concurrencyInput.value = String(advanced.concurrency);

      const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
      if (volumeSlider) volumeSlider.value = String(advanced.soundVolume);
      
      const volumeValue = document.getElementById('volume-value');
      if (volumeValue) volumeValue.textContent = String(advanced.soundVolume);
    }
  }

  private setupAutoSave(): void {
    let saveTimeout: NodeJS.Timeout;

    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        const settings = this.getSettings();
        try {
          await window.electron.settings.save(settings);
        } catch (error) {
          console.error('Failed to save settings', error);
        }
      }, 500);
    };

    document.querySelectorAll('input, select').forEach((element) => {
      element.addEventListener('change', debouncedSave);
    });
  }

  private setupUpdateHandlers(): void {
    window.electron.update.onStatus((status) => {
      this.handleUpdateStatus(status);
    });
  }

  private handleUpdateStatus(status: { event: string; data?: any }): void {
    switch (status.event) {
      case 'update-available':
        if (window.confirm(`New version ${status.data.version} is available. Download now?`)) {
          window.electron.update.download();
        }
        break;
      case 'update-downloaded':
        if (window.confirm('Update downloaded. Restart to install?')) {
          window.electron.update.install();
        }
        break;
      case 'download-progress':
        console.log(`Download progress: ${Math.round(status.data.percent)}%`);
        break;
      case 'update-error':
        console.error('Update error:', status.data.message);
        break;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
