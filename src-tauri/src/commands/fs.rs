use crate::types::{FileStats, DirEntry, ProcessedStatus};
use std::fs;

#[tauri::command]
pub async fn stat_file(path: String) -> Result<FileStats, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    
    Ok(FileStats {
        is_file: metadata.is_file(),
        is_directory: metadata.is_dir(),
        size: metadata.len(),
        mtime: metadata
            .modified()
            .map_err(|e| e.to_string())?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis() as i64,
    })
}

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        
        result.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            is_file: metadata.is_file(),
            is_directory: metadata.is_dir(),
        });
    }
    
    Ok(result)
}

#[tauri::command]
pub async fn check_processed(_app: tauri::AppHandle, file_path: String) -> Result<bool, String> {
    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
    
    // Check for Jpeg
    if let Ok(jpeg) = img_parts::jpeg::Jpeg::from_bytes(bytes.into()) {
        for segment in jpeg.segments() {
            // Check for COM segment (Comment)
            if segment.marker() == img_parts::jpeg::markers::COM {
                let data = segment.contents();
                let content = String::from_utf8_lossy(data);
                if content.contains("Compressed by Jpeglic") {
                    return Ok(true);
                }
            }
        }
    }
    
    Ok(false)
}

#[tauri::command]
pub async fn check_processed_batch(
    _app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<ProcessedStatus>, String> {
    use rayon::prelude::*;

    if file_paths.is_empty() {
        return Ok(Vec::new());
    }

    let results: Vec<ProcessedStatus> = file_paths
        .par_iter()
        .map(|path| {
            let is_processed = (|| -> Result<bool, String> {
                let bytes = fs::read(path).map_err(|e| e.to_string())?;
                if let Ok(jpeg) = img_parts::jpeg::Jpeg::from_bytes(bytes.into()) {
                    for segment in jpeg.segments() {
                        if segment.marker() == img_parts::jpeg::markers::COM {
                            let data = segment.contents();
                            let content = String::from_utf8_lossy(data);
                            if content.contains("Compressed by Jpeglic") {
                                return Ok(true);
                            }
                        }
                    }
                }
                Ok(false)
            })().unwrap_or(false);

            ProcessedStatus {
                path: path.clone(),
                is_processed,
            }
        })
        .collect();

    Ok(results)
}
