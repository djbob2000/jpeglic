import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
if (!container) {
    throw new Error("Root container not found");
}

// Debug: Check if Tauri API is available
console.log('Tauri API check:', {
    hasTauri: typeof window !== 'undefined' && '__TAURI__' in window,
    hasInvoke: typeof window !== 'undefined' && '__TAURI_INVOKE__' in window
});

const root = createRoot(container);

root.render(
    <StrictMode>
        <App />
    </StrictMode>
);

window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
});