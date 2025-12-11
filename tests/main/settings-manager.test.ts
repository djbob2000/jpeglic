import { SettingsManager } from "../../src/main/settings-manager";

jest.mock("electron", () => ({
  app: {
    getPath: jest.fn().mockReturnValue("/tmp/userData"),
  },
}));

jest.mock("fs", () => {
  let store: any = {};
  return {
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockImplementation(() => JSON.stringify(store)),
    writeFileSync: jest.fn().mockImplementation((path, data) => {
      store = JSON.parse(data);
    }),
    mkdirSync: jest.fn(),
  };
});

describe("SettingsManager", () => {
  it("should persist window settings", () => {
    const manager = SettingsManager.getInstance();
    manager.set("window", {
      width: 1024,
      height: 768,
      maximized: true,
      x: 0,
      y: 0,
    });

    const windowSettings = manager.get("window");
    expect(windowSettings.width).toBe(1024);
    expect(windowSettings.height).toBe(768);
    expect(windowSettings.maximized).toBe(true);
  });

  it("should reset settings", () => {
    const manager = SettingsManager.getInstance();
    manager.set("window", {
      width: 1200,
      height: 800,
      maximized: false,
      x: 0,
      y: 0,
    });

    manager.reset();
    const windowSettings = manager.get("window");
    // Default width is 900
    expect(windowSettings.width).toBe(900);
  });
});
