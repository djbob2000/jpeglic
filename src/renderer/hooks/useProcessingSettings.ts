import type { AppSettings, ProcessingSettings } from "@bindings";
import tauriAPI from "@utils/tauriAPI";
import { useEffect, useRef, useState } from "react";

export const useProcessingSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [initializing, setInitializing] = useState(true);
  const hasHydratedSettings = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const stored = await tauriAPI.settings.get();
        if (!mounted) {
          return;
        }

        if (stored && typeof stored === "object") {
          setSettings(stored as AppSettings);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initializing || !settings) {
      return;
    }

    if (!hasHydratedSettings.current) {
      hasHydratedSettings.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      tauriAPI.settings.save(settings).catch((error) => {
        console.error("Failed to save settings", error);
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [settings, initializing]);

  const updateOutputSetting = <K extends keyof ProcessingSettings["output"]>(
    key: K,
    value: ProcessingSettings["output"][K],
  ) => {
    setSettings((previous) => {
      if (!previous) return null;
      return {
        ...previous,
        output: {
          ...previous.output,
          [key]: value,
        },
      };
    });
  };

  const updateAdvancedSetting = <K extends keyof ProcessingSettings["advanced"]>(
    key: K,
    value: ProcessingSettings["advanced"][K],
  ) => {
    setSettings((previous) => {
      if (!previous) return null;
      return {
        ...previous,
        advanced: {
          ...previous.advanced,
          [key]: value,
        },
      };
    });
  };

  return {
    settings,
    initializing,
    updateOutputSetting,
    updateAdvancedSetting,
  };
};
