import type { ProcessingSettings } from "@common/types";
import { cn } from "@utils/cn";

interface SettingsTabProps {
  settings: ProcessingSettings;
  onOutputChange: <K extends keyof ProcessingSettings["output"]>(
    key: K,
    value: ProcessingSettings["output"][K]
  ) => void;
  onAdvancedChange: <K extends keyof ProcessingSettings["advanced"]>(
    key: K,
    value: ProcessingSettings["advanced"][K]
  ) => void;
}

export const SettingsTab = ({
  settings,
  onOutputChange,
  onAdvancedChange,
}: SettingsTabProps) => {
  const handleDestinationChange = async (
    value: ProcessingSettings["output"]["destination"]
  ) => {
    if (value === "source") {
      onOutputChange("destination", value);
      onOutputChange("customDirectory", undefined);
    } else if (value === "custom") {
      // Automatically open directory picker when custom is selected
      const directory = await window.electron.dialog.openDirectory();
      if (directory) {
        onOutputChange("customDirectory", directory);
        onOutputChange("destination", "custom");
      } else {
        // User cancelled - revert to source
        onOutputChange("destination", "source");
        onOutputChange("customDirectory", undefined);
      }
    }
  };

  const browseDirectory = async () => {
    const directory = await window.electron.dialog.openDirectory();
    if (directory) {
      onOutputChange("customDirectory", directory);
      onOutputChange("destination", "custom");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="panel">
        <div className="p-6 space-y-8">
          {/* Main Grid */}
          {/* Main Content */}
          <div className="space-y-6">
            {/* Save To Settings */}
            <fieldset className="space-y-3">
              <legend className="mb-3 block text-sm font-medium text-text-secondary uppercase tracking-wider">
                Save To
              </legend>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3">
                  <input
                    id="destination-source"
                    type="radio"
                    name="destination"
                    value="source"
                    checked={settings.output.destination === "source"}
                    onChange={() => handleDestinationChange("source")}
                    className="radio-input"
                  />
                  <span className="text-text-secondary">Replace originals</span>
                </label>

                {settings.output.destination === "source" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-text-tertiary">
                      Warn me before replace
                    </span>
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.advanced.warnBeforeReplace}
                        onChange={(event) =>
                          onAdvancedChange(
                            "warnBeforeReplace",
                            event.target.checked
                          )
                        }
                        className="peer sr-only"
                      />
                      <div className="h-4 w-7 rounded-full bg-surface-4 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                  </label>
                )}
              </div>
              <label className="flex items-center gap-3">
                <input
                  id="destination-custom"
                  type="radio"
                  name="destination"
                  value="custom"
                  checked={settings.output.destination === "custom"}
                  onChange={() => handleDestinationChange("custom")}
                  className="radio-input"
                />
                <span className="text-text-secondary">Custom</span>
              </label>
              {settings.output.destination === "custom" && (
                <div className="flex gap-2 pl-6">
                  <input
                    type="text"
                    value={settings.output.customDirectory ?? ""}
                    onChange={(event) =>
                      onOutputChange(
                        "customDirectory",
                        event.target.value || undefined
                      )
                    }
                    placeholder="/home/user/Pictures"
                    className="form-control flex-1"
                  />
                  <button
                    type="button"
                    onClick={browseDirectory}
                    className="btn-secondary px-3 py-2"
                  >
                    ...
                  </button>
                </div>
              )}

              {/* cjpegli Settings (Only for JPEG) */}
              {settings.output.format === "jpeg" && (
                <div className="pt-4 border-t border-border mt-4">
                  <legend className="mb-3 block text-sm font-medium text-text-secondary uppercase tracking-wider">
                    JPEG Settings
                  </legend>

                  <div className="space-y-4">
                    {/* Visually Lossless Switch */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-text-primary font-medium">
                          Visually Lossless
                        </span>
                        <span className="text-xs text-text-tertiary">
                          Sets distance to 1.0 (High Quality)
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.output.visuallyLossless}
                          onChange={(e) =>
                            onOutputChange("visuallyLossless", e.target.checked)
                          }
                          className="peer sr-only"
                        />
                        <div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Distance Slider */}
                    <div
                      className={cn(
                        "space-y-2 transition-opacity",
                        settings.output.visuallyLossless &&
                          "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">
                          Distance (Quality)
                        </span>
                        <span className="text-text-primary font-mono">
                          {settings.output.cjpegliDistance.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="6.0"
                        step="0.1"
                        value={settings.output.cjpegliDistance}
                        onChange={(e) =>
                          onOutputChange(
                            "cjpegliDistance",
                            parseFloat(e.target.value)
                          )
                        }
                        disabled={settings.output.visuallyLossless}
                        className="w-full h-2 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-text-tertiary">
                        <span>0.5 (Best)</span>
                        <span>6.0 (Smallest)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Keep Folder Structure - Hidden when Replace originals is selected */}
              {settings.output.destination === "custom" && (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.output.keepFolderStructure}
                    onChange={(event) =>
                      onOutputChange(
                        "keepFolderStructure",
                        event.target.checked
                      )
                    }
                    className="checkbox-input"
                  />
                  <span className="text-text-secondary">
                    Keep Folder Structure
                  </span>
                </label>
              )}

              {/* Advanced Checkboxes moved here */}
              {/* Advanced Checkboxes */}
              {settings.output.destination === "custom" && (
                <div className="pt-2 space-y-3 mt-2">
                  <label
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-all",
                      settings.advanced.deleteOriginals
                        ? "bg-red-500/10"
                        : "hover:bg-surface-3"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={settings.advanced.deleteOriginals}
                      onChange={(event) =>
                        onAdvancedChange(
                          "deleteOriginals",
                          event.target.checked
                        )
                      }
                      className={cn(
                        "checkbox-input",
                        settings.advanced.deleteOriginals && "accent-red-500"
                      )}
                    />
                    <span
                      className={cn(
                        "transition-colors",
                        settings.advanced.deleteOriginals
                          ? "font-medium text-red-500"
                          : "text-text-secondary"
                      )}
                    >
                      Delete originals
                    </span>
                  </label>
                </div>
              )}
            </fieldset>
          </div>
        </div>
      </div>

      {/* Reset Button */}
    </div>
  );
};
