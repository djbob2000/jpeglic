import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
}

export const useConversion = ({
	inputItems,
	settings,
	onSuccessfulConversion,
}: UseConversionParams) => {
	const [isProgressOpen, setProgressOpen] = useState(false);
	const [progress, setProgress] = useState<ProcessingProgress>({ completed: 0, total: 0 });
	const [statusText, setStatusText] = useState("");
	const [result, setResult] = useState<ProcessingResult | null>(null);
	const settingsRef = useRef(settings);
	const successCallbackRef = useRef(onSuccessfulConversion);

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	useEffect(() => {
		successCallbackRef.current = onSuccessfulConversion;
	}, [onSuccessfulConversion]);

	const handleConversionComplete = useCallback((conversionResult: ProcessingResult) => {
		if (conversionResult.canceled) {
			setProgressOpen(false);
			return;
		}

		const activeSettings = settingsRef.current;

		if (activeSettings.advanced.playSoundOnFinish) {
			playNotification(activeSettings.advanced.soundVolume);
		}

		setResult(conversionResult);

		if (activeSettings.advanced.clearInputAfterConversion && conversionResult.successCount > 0) {
			successCallbackRef.current?.();
		}
	}, []);

	useEffect(() => {
		const unsubscribeProgress = window.electron.convert.onProgress((update) => {
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

	const startConversion = useCallback(async () => {
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
			const message = error instanceof Error ? error.message : "Failed to start conversion.";
			window.alert(message);
		}
	}, [inputItems, settings]);

	const cancelConversion = useCallback(() => window.electron.convert.cancel(), []);

	const closeProgress = useCallback(() => {
		setProgressOpen(false);
		setResult(null);
	}, []);

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
