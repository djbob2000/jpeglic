import type {
  InputItem,
  ProcessingProgress,
  ProcessingRequest,
  ProcessingResult,
} from "@common/types";
import tauriAPI from "@utils/tauriAPI";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSettings } from "../contexts/SettingsContext";

interface UseConversionParams {
  inputItems: InputItem[];
  onSuccessfulConversion: () => void;
  onItemProcessed?: (itemId: string) => void;
}

export const useConversion = ({
  inputItems,
  onSuccessfulConversion,
  onItemProcessed,
}: UseConversionParams) => {
  const { settings } = useSettings();
  const [isProgressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    completed: 0,
    total: 0,
  });
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [lastOutputPath, setLastOutputPath] = useState<string | null>(null);

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

  const handleConversionComplete = useCallback((conversionResult: ProcessingResult) => {
    if (conversionResult.canceled) {
      setProgressOpen(false);
      return;
    }

    const activeSettings = settingsRef.current;

    setResult(conversionResult);
    // Clear current item from progress so preview doesn't show "Processing..."
    setProgress((prev) => ({ ...prev, currentItem: undefined }));

    if (activeSettings.advanced.clearInputAfterConversion && conversionResult.successCount > 0) {
      successCallbackRef.current?.();
    }
  }, []);

  useEffect(() => {
    const unsubscribeProgress = tauriAPI.convert.onProgress((update) => {
      // If an item was just processed (success or skipped), remove it from the list
      if (update.processedItemId) {
        itemProcessedCallbackRef.current?.(update.processedItemId);
      }

      if (update.total > 0) {
        void tauriAPI.window.setProgressBar(update.completed / update.total);
      }

      if (update.currentOutputPath) {
        setLastOutputPath(update.currentOutputPath);
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

    const unsubscribeComplete = tauriAPI.convert.onComplete((res) => {
      void tauriAPI.window.setProgressBar(-1);
      setIsStopping(false);
      handleConversionComplete(res);
    });

    const unsubscribeError = tauriAPI.convert.onError((error) => {
      void tauriAPI.window.setProgressBar(-1);
      setProgressOpen(false);
      setIsStopping(false);
      toast.error(error.message);
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, [handleConversionComplete]);

  const startConversion = async () => {
    if (inputItems.length === 0) {
      toast.warning("Add files before starting conversion.");
      return;
    }

    if (!settings) {
      toast.error("Settings not loaded.");
      return;
    }

    const request: ProcessingRequest = {
      items: inputItems,
      settings,
    };

    setProgressOpen(true);
    setResult(null);
    setLastOutputPath(null);
    setProgress({ completed: 0, total: inputItems.length });
    setStatusText("");
    setIsStopping(false);

    try {
      await tauriAPI.convert.start(request);
    } catch (error) {
      setProgressOpen(false);
      const message = error instanceof Error ? error.message : "Failed to start conversion.";
      toast.error(message);
    }
  };

  const cancelConversion = () => {
    setIsStopping(true);
    void tauriAPI.convert.cancel();
  };

  const closeProgress = () => {
    setProgressOpen(false);
    setResult(null);
    setProgress({ completed: 0, total: 0 });
    setStatusText("");
    setIsStopping(false);
  };

  const normalizedStatusText = useMemo(() => statusText.trim(), [statusText]);

  const percentage = useMemo(() => {
    if (progress.total === 0) {
      return 0;
    }
    return Math.min(100, (progress.completed / progress.total) * 100);
  }, [progress.completed, progress.total]);

  return {
    isConverting: isProgressOpen && !result,
    isStopping,
    startConversion,
    cancelConversion,
    closeProgress,
    isProgressOpen,
    progress,
    result,
    statusText: normalizedStatusText,
    percentage,
    lastOutputPath,
  };
};
