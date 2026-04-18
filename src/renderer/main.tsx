import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { SettingsProvider } from "./contexts/SettingsContext";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <SettingsProvider>
      <App />
      <Toaster position="bottom-center" richColors theme="system" />
    </SettingsProvider>
  </StrictMode>,
);
