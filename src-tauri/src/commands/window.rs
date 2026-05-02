use tauri::Window;

#[tauri::command]
pub async fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn maximize_window(window: Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_progress_bar(_window: Window, _progress: f64) -> Result<(), String> {
    // Windows taskbar progress
    #[cfg(target_os = "windows")]
    {
        use tauri::Emitter;
        _window
            .emit("progress", _progress)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
