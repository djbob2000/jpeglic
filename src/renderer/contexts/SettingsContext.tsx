import { type PropsWithChildren, createContext, useContext } from "react";
import type { ProcessingSettings } from "../../bindings/ProcessingSettings";
import { useProcessingSettings } from "../hooks/useProcessingSettings";

interface SettingsContextType {
  settings: ProcessingSettings | null;
  updateOutputSetting: <K extends keyof ProcessingSettings["output"]>(
    key: K,
    value: ProcessingSettings["output"][K],
  ) => void;
  updateAdvancedSetting: <K extends keyof ProcessingSettings["advanced"]>(
    key: K,
    value: ProcessingSettings["advanced"][K],
  ) => void;
  initializing: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const { settings, updateOutputSetting, updateAdvancedSetting, initializing } =
    useProcessingSettings();

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateOutputSetting,
        updateAdvancedSetting,
        initializing,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
