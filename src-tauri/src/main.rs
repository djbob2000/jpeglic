// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod processing;
mod settings;
mod types;
mod utils;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::convert::start_conversion,
            commands::convert::cancel_conversion,
            commands::dialog::open_files,
            commands::dialog::open_directory,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::reset_settings,
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::set_progress_bar,
            commands::fs::stat_file,
            commands::fs::read_directory,
            commands::fs::check_processed,
            commands::fs::check_processed_batch,
            commands::preview::get_preview,
        ])
        .setup(|app| {
            // Initialize settings manager
            let app_handle = app.handle().clone();
            app.manage(settings::SettingsManager::new(app_handle)?);
            
            // Initialize processing state
            app.manage(processing::ProcessingState::new());
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
