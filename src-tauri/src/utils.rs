use thiserror::Error;

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

    #[error("Process execution failed: {0}")]
    ProcessFailed(String),
    
    #[error("File already processed")]
    AlreadyProcessed,
}

pub type Result<T> = std::result::Result<T, AppError>;
