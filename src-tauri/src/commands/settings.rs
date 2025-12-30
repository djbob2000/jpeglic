use crate::types::AppSettings;
use crate::settings::SettingsManager;
use tauri::State;

#[tauri::command]
pub async fn get_settings(
    settings_manager: State<'_, SettingsManager>,
) -> Result<AppSettings, String> {
    settings_manager
        .get()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(
    settings_manager: State<'_, SettingsManager>,
    settings: AppSettings,
) -> Result<(), String> {
    settings_manager
        .save(settings)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reset_settings(
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager
        .reset()
        .map_err(|e| e.to_string())
}
