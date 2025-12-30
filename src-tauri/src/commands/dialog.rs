use tauri_plugin_dialog::DialogExt;
use tauri::AppHandle;
use tokio::sync::oneshot;

#[tauri::command]
pub async fn open_files(app: AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "avif", "gif", "bmp", "tiff"])
        .add_filter("All Files", &["*"])
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });
    
    match rx.await.map_err(|e| e.to_string())? {
        Some(paths) => Ok(paths.iter().map(|p| p.to_string()).collect()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn open_directory(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .pick_folder(move |folder| {
            let _ = tx.send(folder);
        });
    
    match rx.await.map_err(|e| e.to_string())? {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}
