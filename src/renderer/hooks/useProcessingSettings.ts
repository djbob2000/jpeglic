import { useEffect, useRef, useState } from "react";
import type { ProcessingSettings } from "../../common/types";
import { defaultSettings } from "../constants/defaultSettings";
import { mergeSettings } from "../utils/settings";

// Function to detect CPU cores
const detectCpuCores = (): number => {
	try {
		// Try to use the hardware concurrency API
		if (navigator.hardwareConcurrency) {
			return Math.min(navigator.hardwareConcurrency, 32); // Cap at 32 for safety
		}
		// Fallback to a reasonable default
		return 4;
	} catch {
		return 4;
	}
};

export const useProcessingSettings = () => {
	const [settings, setSettings] = useState<ProcessingSettings>(defaultSettings);
	const [initializing, setInitializing] = useState(true);
	const hasHydratedSettings = useRef(false);

	useEffect(() => {
		let mounted = true;

		const loadSettings = async () => {
			try {
				const stored = await window.electron.settings.get();
				if (!mounted) {
					return;
				}

				if (stored && typeof stored === "object") {
					// Always ensure concurrency is set to CPU cores if not explicitly set
					setSettings((previous) => {
						const mergedSettings = mergeSettings(previous, stored as Partial<ProcessingSettings>);
						const cpuCores = detectCpuCores();

						// If concurrency is not set or is the old default (4), update it to CPU cores
						if (!mergedSettings.advanced.concurrency || mergedSettings.advanced.concurrency === 4) {
							mergedSettings.advanced.concurrency = cpuCores;
						}

						// Enforce simplified defaults even if stored values exist (for this refactor)
						// This ensures users migrating from the old version get the new simplified behavior
						mergedSettings.output.format = "jpeg";
						mergedSettings.advanced.soundVolume = 100;
						mergedSettings.downscale.resampling = "lanczos3";
						mergedSettings.advanced.skipProcessed = true;
						mergedSettings.advanced.preserveMetadata = true;
						mergedSettings.advanced.preserveTimestamps = true;
						mergedSettings.advanced.playSoundOnFinish = false;

						return mergedSettings;
					});
				} else {
					// No stored settings, auto-detect CPU cores for concurrency and set defaults
					const cpuCores = detectCpuCores();
					setSettings((previous) => ({
						...previous,
						output: {
							...previous.output,
							format: "jpeg",
						},
						downscale: {
							...previous.downscale,
							resampling: "lanczos3",
						},
						advanced: {
							...previous.advanced,
							concurrency: cpuCores,
							soundVolume: 100,
						},
					}));
				}
			} catch (error) {
				console.error("Failed to load settings", error);
			} finally {
				if (mounted) {
					setInitializing(false);
				}
			}
		};

		loadSettings();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (initializing) {
			return;
		}

		if (!hasHydratedSettings.current) {
			hasHydratedSettings.current = true;
			return;
		}

		const timeout = setTimeout(() => {
			window.electron.settings.save(settings).catch((error) => {
				console.error("Failed to save settings", error);
			});
		}, 500);

		return () => clearTimeout(timeout);
	}, [settings, initializing]);

	const updateOutputSetting = <K extends keyof ProcessingSettings["output"]>(
		key: K,
		value: ProcessingSettings["output"][K],
	) => {
		setSettings((previous) => ({
			...previous,
			output: {
				...previous.output,
				[key]: value,
			},
		}));
	};

	const updateDownscaleSetting = <K extends keyof ProcessingSettings["downscale"]>(
		key: K,
		value: ProcessingSettings["downscale"][K],
	) => {
		setSettings((previous) => ({
			...previous,
			downscale: {
				...previous.downscale,
				[key]: value,
			},
		}));
	};

	const updateAdvancedSetting = <K extends keyof ProcessingSettings["advanced"]>(
		key: K,
		value: ProcessingSettings["advanced"][K],
	) => {
		setSettings((previous) => ({
			...previous,
			advanced: {
				...previous.advanced,
				[key]: value,
			},
		}));
	};

	return {
		settings,
		initializing,
		updateOutputSetting,
		updateDownscaleSetting,
		updateAdvancedSetting,
	};
};
