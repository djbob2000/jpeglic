import { useEffect } from "react";

export const useUpdateNotifications = () => {
  useEffect(() => {
    // Disabling Electron-based update notifications for Tauri
    console.log("Update notifications are currently disabled in Tauri mode");
  }, []);
};
