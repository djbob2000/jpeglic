import { useEffect, useState } from "react";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProgressModal } from "./components/ProgressModal";
import { ReplaceWarningModal } from "./components/ReplaceWarningModal";
import { Titlebar } from "./components/Titlebar";
import { useConversion } from "./hooks/useConversion";
import { useInputItems } from "./hooks/useInputItems";
import { useProcessingSettings } from "./hooks/useProcessingSettings";
import { useUpdateNotifications } from "./hooks/useUpdateNotifications";
import { InputTab } from "./views/InputTab";
import { SettingsTab } from "./views/SettingsTab";

const App = () => {
  const { items, addFiles, removeItem, clearItems, hasItems } = useInputItems();
  const { settings, updateOutputSetting, updateAdvancedSetting } =
    useProcessingSettings();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handlePostConversion = () => {
    clearItems();
  };

  const {
    startConversion,
    cancelConversion,
    closeProgress,
    isProgressOpen,
    progress,
    result,
    statusText,
    percentage,
  } = useConversion({
    inputItems: items,
    settings,
    onSuccessfulConversion: handlePostConversion,
    onItemProcessed: removeItem,
  });

  const handleStartClick = () => {
    if (
      settings.output.destination === "source" &&
      settings.advanced.warnBeforeReplace
    ) {
      setShowReplaceWarning(true);
    } else {
      startConversion();
    }
  };

  const handleWarningConfirm = () => {
    setShowReplaceWarning(false);
    startConversion();
  };

  const handleDontShowAgain = (value: boolean) => {
    if (value) {
      updateAdvancedSetting("warnBeforeReplace", false);
    }
  };

  useUpdateNotifications();

  // Auto-select logic
  useEffect(() => {
    if (items.length > 0) {
      if (!selectedItemId || !items.find((i) => i.id === selectedItemId)) {
        setSelectedItemId(items[0].id);
      }
    } else {
      setSelectedItemId(null);
    }
  }, [items, selectedItemId]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="flex h-full flex-col font-sans bg-surface-1 text-text-primary">
      <Titlebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content: Preview & Settings */}
        <main className="flex flex-1 flex-col min-w-0 min-h-0 bg-surface-1 relative">
          <div className="flex-1 overflow-hidden relative">
            {isSettingsOpen ? (
              <div className="h-full overflow-y-auto p-8">
                <div className="mx-auto max-w-3xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Configuration
                    </h2>
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <SettingsTab
                    settings={settings}
                    onOutputChange={updateOutputSetting}
                    onAdvancedChange={updateAdvancedSetting}
                  />
                </div>
              </div>
            ) : (
              <PreviewPanel
                selectedItem={selectedItem}
                processing={progress}
                onAddFiles={addFiles}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </div>
        </main>

        {/* Right Sidebar: Input & Files */}
        <aside className="flex w-80 min-w-[300px] flex-col border-l border-border bg-surface-2">
          <InputTab
            items={items}
            onAddFiles={addFiles}
            onRemove={removeItem}
            onClear={clearItems}
            hasItems={hasItems}
            processing={progress}
            selectedItemId={selectedItemId}
            onSelect={setSelectedItemId}
            onStartConversion={handleStartClick}
          />
        </aside>
      </div>

      <ProgressModal
        isOpen={isProgressOpen && !!result}
        progress={progress}
        status={statusText}
        percentage={percentage}
        onCancel={cancelConversion}
        result={result}
        onClose={closeProgress}
      />

      <ReplaceWarningModal
        isOpen={showReplaceWarning}
        onConfirm={handleWarningConfirm}
        onCancel={() => setShowReplaceWarning(false)}
        onDontShowAgain={handleDontShowAgain}
      />
    </div>
  );
};

export default App;
