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
pub async fn check_processed(app: tauri::AppHandle, file_path: String) -> Result<bool, String> {
    // Use exiftool to check for XMP CreatorTool marker
    use crate::utils::{resolve_binary, create_windowless_command};
    // Command import is no longer needed since we use the helper
    
    let exiftool = resolve_binary(&app, "exiftool").map_err(|e| e.to_string())?;
    
    let output = create_windowless_command(exiftool)
        .args(["-XMP:CreatorTool", "-s", "-s", "-s", &file_path])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        let creator_tool = String::from_utf8_lossy(&output.stdout);
        Ok(creator_tool.trim() == "HomeArchiveConverter")
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn check_processed_batch(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<ProcessedStatus>, String> {
    use crate::utils::{resolve_binary, create_windowless_command};
    use serde_json::Value;
    use rayon::prelude::*;

    if file_paths.is_empty() {
        return Ok(Vec::new());
    }

    let exiftool = resolve_binary(&app, "exiftool").map_err(|e| e.to_string())?;
    
    // Determine chunk size based on CPU cores to maximize parallelism
    // but cap it at 100 to stay well within command-line length limits (especially on Windows)
    let cpus = num_cpus::get();
    let total_files = file_paths.len();
    let chunk_size = if total_files <= 100 {
        total_files
    } else {
        // Aim for one chunk per core, but no less than 50 and no more than 100 files per chunk
        let target = total_files.div_ceil(cpus);
        target.clamp(50, 100)
    };

    // Use rayon to process chunks in parallel
    let results: Result<Vec<Vec<ProcessedStatus>>, String> = file_paths
        .par_chunks(chunk_size)
        .map(|chunk| {
            let mut chunk_results = Vec::new();
            let output = create_windowless_command(&exiftool)
                .args(["-json", "-XMP:CreatorTool", "-XMP:Label"])
                .args(chunk)
                .output()
                .map_err(|e| e.to_string())?;

            if output.status.success() {
                let json_str = String::from_utf8_lossy(&output.stdout);
                let json: Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

                if let Some(array) = json.as_array() {
                    for item in array {
                        let source_file = item["SourceFile"].as_str().unwrap_or("").to_string();
                        let creator_tool = item["CreatorTool"].as_str().unwrap_or("");
                        let label = item["Label"].as_str().unwrap_or("");

                        let is_processed = creator_tool == "HomeArchiveConverter" || label == "Processed";

                        chunk_results.push(ProcessedStatus {
                            path: source_file,
                            is_processed,
                        });
                    }
                }
            } else {
                // If batch fails, mark all in this chunk as not processed for safety
                for path in chunk {
                    chunk_results.push(ProcessedStatus {
                        path: path.clone(),
                        is_processed: false,
                    });
                }
            }
            Ok(chunk_results)
        })
        .collect();

    // Flatten the results
    Ok(results?.into_iter().flatten().collect())
}
