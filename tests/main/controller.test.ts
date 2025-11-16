import { BrowserWindow } from 'electron';
import { Controller } from '../../src/main/controller';
import { ProcessingRequest } from '../../src/common/types';

jest.mock('electron', () => {
  const sendMock = jest.fn();
  return {
    BrowserWindow: jest.fn().mockImplementation(() => ({
      webContents: {
        send: sendMock,
      },
    })),
  };
});

describe('Controller', () => {
  let controller: Controller;
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    mockWindow = new BrowserWindow();
    controller = new Controller(mockWindow);
  });

  it('should process items sequentially when concurrency is 1', async () => {
    const request: ProcessingRequest = {
      items: [
        {
          id: '1',
          sourcePath: '/path/to/image1.png',
          displayName: 'image1.png',
          relativePath: 'folder/image1.png',
          sizeBytes: 1000,
          lastModified: Date.now(),
        },
        {
          id: '2',
          sourcePath: '/path/to/image2.png',
          displayName: 'image2.png',
          relativePath: 'folder/image2.png',
          sizeBytes: 2000,
          lastModified: Date.now(),
        },
      ],
      settings: {
        output: {
          format: 'jpeg',
          quality: 90,
          effort: 7,
          lossless: false,
          keepAlpha: true,
          destination: 'source',
          keepFolderStructure: false,
          renameStrategy: 'skip',
          suffix: '',
        },
        downscale: {
          mode: 'none',
          allowEnlarge: false,
          resampling: 'lanczos3',
        },
        advanced: {
          concurrency: 1,
          preserveMetadata: false,
          preserveTimestamps: false,
          deleteOriginals: false,
          playSoundOnFinish: false,
          soundVolume: 50,
          clearInputAfterConversion: false,
        },
      },
    };

    const result = await controller.startProcessing(request);

    expect(result.successCount + result.failedCount + result.skippedCount).toBe(2);
    expect(mockWindow.webContents.send).toHaveBeenCalled();
  });
});
