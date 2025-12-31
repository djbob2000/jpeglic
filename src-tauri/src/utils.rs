use std::path::PathBuf;
use thiserror::Error;
use tauri::Manager;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),
    
    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    
    #[error("Binary not found: {0}")]
    BinaryNotFound(String),
    
    #[error("Process execution failed: {0}")]
    ProcessFailed(String),
    
    #[error("File already processed")]
    AlreadyProcessed,
}

pub type Result<T> = std::result::Result<T, AppError>;

/// Resolve platform-specific binary path
#[allow(dead_code)]
pub fn resolve_binary(app: &tauri::AppHandle, name: &str) -> Result<PathBuf> {
    // Check for both plain name and sidecar name with target triple
    // In dev/sidecar mode, files usually have the target triple suffix
    let target_triple = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") { "aarch64-apple-darwin" } else { "x86_64-apple-darwin" }
    } else if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else {
        "x86_64-unknown-linux-gnu"
    };
    
    let names_to_check = if cfg!(windows) {
        vec![
            format!("{}.exe", name),
            format!("{}-{}.exe", name, target_triple),
        ]
    } else {
        vec![
            name.to_string(),
            format!("{}-{}", name, target_triple),
        ]
    };
    
    for filename in names_to_check {
        // Check in resources directory (bundled app)
        if let Ok(resource_dir) = app.path().resource_dir() {
            let binary_path = resource_dir.join("binaries").join(&filename);
            if binary_path.exists() {
                return Ok(binary_path);
            }
        }
        
        // Check in development binaries folder
        let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(&filename);
        
        if dev_path.exists() {
            return Ok(dev_path);
        }
    }
    
    Err(AppError::BinaryNotFound(name.to_string()))
}

/// Create a process::Command that doesn't show a window on Windows
#[allow(dead_code)]
pub fn create_windowless_command<S: AsRef<std::ffi::OsStr>>(program: S) -> std::process::Command {
    #[allow(unused_mut)]
    let mut command = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}
