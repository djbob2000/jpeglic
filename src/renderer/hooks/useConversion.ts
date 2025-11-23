import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InputItem,
  ProcessingProgress,
  ProcessingRequest,
  ProcessingResult,
  ProcessingSettings,
} from "../../common/types";
import { playNotification } from "../utils/format";

interface UseConversionParams {
  inputItems: InputItem[];
  settings: ProcessingSettings;
  onSuccessfulConversion: () => void;
  onItemProcessed?: (itemId: string) => void;
}

export const useConversion = ({
  inputItems,
  settings,
  onSuccessfulConversion,
  onItemProcessed,
}: UseConversionParams) => {
  const [isProgressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    completed: 0,
    total: 0,
  });
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const settingsRef = useRef(settings);
  const successCallbackRef = useRef(onSuccessfulConversion);
  const itemProcessedCallbackRef = useRef(onItemProcessed);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    successCallbackRef.current = onSuccessfulConversion;
  }, [onSuccessfulConversion]);

  useEffect(() => {
    itemProcessedCallbackRef.current = onItemProcessed;
  }, [onItemProcessed]);

  const handleConversionComplete = (conversionResult: ProcessingResult) => {
    if (conversionResult.canceled) {
      setProgressOpen(false);
      return;
    }

    const activeSettings = settingsRef.current;

    setResult(conversionResult);
    // Clear current item from progress so preview doesn't show "Processing..."
    setProgress((prev) => ({ ...prev, currentItem: undefined }));

    if (
      activeSettings.advanced.clearInputAfterConversion &&
      conversionResult.successCount > 0
    ) {
      successCallbackRef.current?.();
    }
  };

  useEffect(() => {
    const unsubscribeProgress = window.electron.convert.onProgress((update) => {
      // If an item was just processed (success or skipped), remove it from the list
      if (update.processedItemId) {
        itemProcessedCallbackRef.current?.(update.processedItemId);
      }

      setProgress(update);
      if (update.message) {
        setStatusText(update.message);
      } else if (update.currentItem) {
        setStatusText(`Processing ${update.currentItem.displayName}`);
      } else {
        setStatusText("");
      }
    });

    const unsubscribeComplete = window.electron.convert.onComplete((res) => {
      handleConversionComplete(res);
    });

    const unsubscribeError = window.electron.convert.onError((error) => {
      setProgressOpen(false);
      window.alert(error.message);
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, [handleConversionComplete]);

  const startConversion = async () => {
    if (inputItems.length === 0) {
      window.alert("Add files before starting conversion.");
      return;
    }

    const request: ProcessingRequest = {
      items: inputItems,
      settings,
    };

    setProgressOpen(true);
    setResult(null);
    setProgress({ completed: 0, total: inputItems.length });
    setStatusText("");

    try {
      const response = await window.electron.convert.start(request);
      if (!response.success && response.error) {
        setProgressOpen(false);
        window.alert(response.error);
      }
    } catch (error) {
      setProgressOpen(false);
      const message =
        error instanceof Error ? error.message : "Failed to start conversion.";
      window.alert(message);
    }
  };

  const cancelConversion = () => window.electron.convert.cancel();

  const closeProgress = () => {
    setProgressOpen(false);
    setResult(null);
    setProgress({ completed: 0, total: 0 });
    setStatusText("");
  };

  const normalizedStatusText = useMemo(() => statusText.trim(), [statusText]);

  const percentage = useMemo(() => {
    if (progress.total === 0) {
      return 0;
    }
    return Math.min(100, (progress.completed / progress.total) * 100);
  }, [progress.completed, progress.total]);

  return {
    startConversion,
    cancelConversion,
    closeProgress,
    isProgressOpen,
    progress,
    result,
    statusText: normalizedStatusText,
    percentage,
  };
};
