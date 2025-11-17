import { useCallback, useEffect, useRef, useState } from "react";
import type { ProcessingSettings } from "../../common/types";
import { defaultSettings } from "../constants/defaultSettings";
import { mergeSettings } from "../utils/settings";

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
					setSettings((previous) => mergeSettings(previous, stored as Partial<ProcessingSettings>));
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

	const updateOutputSetting = useCallback(
		<K extends keyof ProcessingSettings["output"]>(
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
		},
		[],
	);

	const updateDownscaleSetting = useCallback(
		<K extends keyof ProcessingSettings["downscale"]>(
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
		},
		[],
	);

	const updateAdvancedSetting = useCallback(
		<K extends keyof ProcessingSettings["advanced"]>(
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
		},
		[],
	);

	return {
		settings,
		initializing,
		updateOutputSetting,
		updateDownscaleSetting,
		updateAdvancedSetting,
	};
};
