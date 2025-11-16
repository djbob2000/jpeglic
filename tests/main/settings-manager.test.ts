import { SettingsManager } from '../../src/main/settings-manager';

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    let store: any = {};
    return {
      get: (key: string) => store[key],
      set: (key: string, value: any) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
      get store() {
        return store;
      },
    };
  });
});

describe('SettingsManager', () => {
  it('should persist window settings', () => {
    const manager = SettingsManager.getInstance();
    manager.set('window', {
      width: 1024,
      height: 768,
      maximized: true,
    });

    const windowSettings = manager.get('window');
    expect(windowSettings.width).toBe(1024);
    expect(windowSettings.height).toBe(768);
    expect(windowSettings.maximized).toBe(true);
  });

  it('should reset settings', () => {
    const manager = SettingsManager.getInstance();
    manager.set('window', {
      width: 1200,
      height: 800,
      maximized: false,
    });

    manager.reset();
    const windowSettings = manager.get('window');
    expect(windowSettings.width).toBeUndefined();
  });
});
