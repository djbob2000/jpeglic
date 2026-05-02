import { useEffect, useState } from "react";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProgressModal } from "./components/ProgressModal";
import { ReplaceWarningModal } from "./components/ReplaceWarningModal";
import { useSettings } from "./contexts/SettingsContext";
import { useConversion } from "./hooks/useConversion";
import { useInputItems } from "./hooks/useInputItems";
import { useUpdateNotifications } from "./hooks/useUpdateNotifications";
import { InputTab } from "./views/InputTab";
import { SettingsTab } from "./views/SettingsTab";

const App = () => {
  const { items, addFiles, removeItem, clearItems, hasItems, isLoading, loadedCount } =
    useInputItems();
  const { settings, updateAdvancedSetting, initializing } = useSettings();
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
    isConverting,
    isStopping,
    lastOutputPath,
  } = useConversion({
    inputItems: items,
    onSuccessfulConversion: handlePostConversion,
    onItemProcessed: removeItem,
  });

  const handleStartClick = () => {
    if (!settings) return;
    if (settings.output.destination === "source" && settings.advanced.warnBeforeReplace) {
      setShowReplaceWarning(true);
    } else {
      void startConversion();
    }
  };

  const handleWarningConfirm = () => {
    setShowReplaceWarning(false);
    void startConversion();
  };

  const handleDontShowAgain = (value: boolean) => {
    if (value) {
      updateAdvancedSetting("warnBeforeReplace", false);
    }
  };

  useUpdateNotifications();

  // Auto-deselect logic (if the selected item is removed)
  useEffect(() => {
    if (selectedItemId && !items.find((i) => i.id === selectedItemId)) {
      const timer = setTimeout(() => setSelectedItemId(null), 0);
      return () => clearTimeout(timer);
    }
  }, [items, selectedItemId]);

  if (initializing || !settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-1">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-sm" />
      </div>
    );
  }

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="flex h-full flex-col font-sans bg-surface-1 text-text-primary">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content: Preview & Settings */}
        <main className="flex flex-1 flex-col min-w-0 min-h-0 bg-surface-1 relative">
          <div className="flex-1 overflow-hidden relative">
            {isSettingsOpen ? (
              <div className="h-full overflow-y-auto p-8">
                <div className="mx-auto max-w-3xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <title>Settings</title>
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
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <title>Close Settings</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <SettingsTab />
                </div>
              </div>
            ) : (
              <PreviewPanel
                selectedItem={selectedItemId ? selectedItem : undefined}
                processing={progress}
                onAddFiles={addFiles}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isConverting={isConverting}
                percentage={percentage}
                lastProcessedPath={lastOutputPath}
              />
            )}
          </div>
        </main>

        {/* Right Sidebar: Input & Files */}
        <aside className="flex w-80 min-w-76 flex-col border-l border-border bg-surface-2">
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
            isConverting={isConverting}
            isStopping={isStopping}
            onCancel={cancelConversion}
            isLoading={isLoading}
            loadedCount={loadedCount}
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
