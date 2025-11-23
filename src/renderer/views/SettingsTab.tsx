import type { ProcessingSettings } from "../../common/types";

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
  const handleDestinationChange = (
    value: ProcessingSettings["output"]["destination"]
  ) => {
    onOutputChange("destination", value);
    if (value === "source") {
      onOutputChange("customDirectory", undefined);
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
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-all ${
                      settings.advanced.deleteOriginals
                        ? "bg-red-500/10"
                        : "hover:bg-surface-3"
                    }`}
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
                      className={`checkbox-input ${
                        settings.advanced.deleteOriginals
                          ? "accent-red-500"
                          : ""
                      }`}
                    />
                    <span
                      className={
                        settings.advanced.deleteOriginals
                          ? "font-medium text-red-500"
                          : "text-text-secondary"
                      }
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
