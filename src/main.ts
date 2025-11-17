import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { Controller } from './main/controller';
import { ProcessManager } from './main/process-manager';
import { SettingsManager, AppSettings } from './main/settings-manager';
import { UpdateManager } from './main/updater';

let mainWindow: BrowserWindow | null = null;
let controller: Controller | null = null;
let updateManager: UpdateManager | null = null;

function createWindow(): void {
  const settingsManager = SettingsManager.getInstance();
  const windowState = settingsManager.get('window');

  mainWindow = new BrowserWindow({
    width: windowState?.width ?? 900,
    height: windowState?.height ?? 600,
    x: windowState?.x,
    y: windowState?.y,
    title: 'XL Converter',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hidden',
  });

  if (windowState?.maximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  controller = new Controller(mainWindow);
  updateManager = new UpdateManager(mainWindow);

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      SettingsManager.getInstance().set('window', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        maximized: mainWindow.isMaximized(),
      });
    }
  });

  mainWindow.on('closed', () => {
    if (controller) {
      ProcessManager.terminateAll();
    }
    mainWindow = null;
    controller = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  updateManager?.checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('convert:start', async (event, data) => {
  if (!controller) {
    return { success: false, error: 'Controller not initialized' };
  }

  try {
    void controller.startProcessing(data).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      event.sender.send('convert:error', { message });
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    event.sender.send('convert:error', { message });
    return { success: false, error: message };
  }
});

ipcMain.handle('convert:cancel', async () => {
  if (!controller) return;
  controller.cancel();
});

ipcMain.handle('dialog:openFiles', async () => {
  if (!mainWindow) return [];
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'jxl', 'avif', 'gif', 'bmp', 'tiff'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result.filePaths;
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  return result.filePaths[0] || null;
});

ipcMain.handle('settings:get', async () => {
  return SettingsManager.getInstance().getAll();
});

ipcMain.handle('settings:save', async (_event, settings: Partial<AppSettings>) => {
  SettingsManager.getInstance().setAll(settings);
});

ipcMain.handle('settings:reset', async () => {
  SettingsManager.getInstance().reset();
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('update:check', async () => {
  if (updateManager) {
    await updateManager.checkForUpdates();
  }
});

ipcMain.handle('update:download', async () => {
  if (updateManager) {
    await updateManager.downloadUpdate();
  }
});

ipcMain.handle('update:install', () => {
  if (updateManager) {
    updateManager.quitAndInstall();
  }
});

ipcMain.handle('fs:stat', async (_, path: string) => {
  try {
    const fs = await import('fs');
    const stats = fs.statSync(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime.getTime(),
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('fs:readdir', async (_, path: string) => {
  try {
    const fs = await import('fs');
    const entries = fs.readdirSync(path, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    }));
  } catch (error) {
    throw error;
  }
});
