use crate::types::*;
use crate::utils::{AppError, Result, resolve_binary, create_windowless_command};
use image::ImageReader;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct Worker {
    item: InputItem,
    settings: ProcessingSettings,
    cancel_flag: Arc<AtomicBool>,
    app: tauri::AppHandle,
}

#[derive(Debug)]
pub struct WorkerResult {
    pub success: bool,
    pub skipped: bool,
    pub error: Option<String>,
    pub output_path: Option<String>,
    pub saved_bytes: Option<u64>,
}

impl Worker {
    pub fn new(
        item: InputItem,
        settings: ProcessingSettings,
        cancel_flag: Arc<AtomicBool>,
        app: tauri::AppHandle,
    ) -> Self {
        Self {
            item,
            settings,
            cancel_flag,
            app,
        }
    }
    
    pub async fn process(&self) -> WorkerResult {
        if self.is_cancelled() {
            return WorkerResult {
                success: false,
                skipped: false,
                error: Some("Cancelled".to_string()),
                output_path: None,
                saved_bytes: None,
            };
        }
        
        match self.process_internal().await {
            Ok((output_path, saved_bytes)) => WorkerResult {
                success: true,
                skipped: false,
                error: None,
                output_path: Some(output_path),
                saved_bytes: Some(saved_bytes),
            },
            Err(AppError::AlreadyProcessed) => WorkerResult {
                success: false,
                skipped: true,
                error: None,
                output_path: None,
                saved_bytes: None,
            },
            Err(e) => WorkerResult {
                success: false,
                skipped: false,
                error: Some(e.to_string()),
                output_path: None,
                saved_bytes: None,
            },
        }
    }
    
    async fn process_internal(&self) -> Result<(String, u64)> {
        // Check if already processed
        if self.settings.advanced.skip_processed {
            if let Some(true) = self.item.is_processed {
                return Err(AppError::AlreadyProcessed);
            }
        }
        
        // Prepare output path
        let output_info = self.prepare_output_path()?;
        
        if output_info.should_copy_only {
            // Just copy the file
            fs::copy(&self.item.source_path, &output_info.target_path)?;
        } else {
            // Convert the image
            let temp_path = format!("{}.{}.tmp", output_info.target_path, uuid::Uuid::new_v4());
            
            match self.convert_image(&temp_path).await {
                Ok(_) => {
                    // Apply metadata
                    self.apply_metadata(&temp_path).await?;
                    
                    // Delete original if requested
                    if self.settings.advanced.delete_originals {
                        let _ = trash::delete(&self.item.source_path);
                    }
                    
                    // Move temp to final location
                    fs::rename(&temp_path, &output_info.target_path)?;
                }
                Err(e) => {
                    // Cleanup temp file
                    let _ = fs::remove_file(&temp_path);
                    return Err(e);
                }
            }
        }
        
        // Calculate saved bytes
        let output_size = fs::metadata(&output_info.target_path)?.len();
        let saved_bytes = self.item.size_bytes.saturating_sub(output_size);
        
        Ok((output_info.target_path, saved_bytes))
    }
    
    async fn convert_image(&self, output_path: &str) -> Result<()> {
        match self.settings.output.format {
            OutputFormat::Jpeg => self.export_jpeg(output_path).await,
        }
    }
    
    async fn export_jpeg(&self, output_path: &str) -> Result<()> {
        let cjpegli = resolve_binary(&self.app, "cjpegli")?;
        
        // Load image and convert to RGB
        let img = ImageReader::open(&self.item.source_path)?.decode()?;
        let rgb_img = img.to_rgb8();
        
        // Create PPM header
        let (width, height) = rgb_img.dimensions();
        let ppm_header = format!("P6\n{} {}\n255\n", width, height);
        
        // Combine header and raw RGB data
        let mut ppm_data = ppm_header.into_bytes();
        ppm_data.extend_from_slice(rgb_img.as_raw());
        
        // Build cjpegli arguments
        let mut args = vec!["-".to_string(), output_path.to_string()];
        
        if self.settings.output.visually_lossless {
            args.push("-d".to_string());
            args.push("1.0".to_string());
            args.push("--chroma_subsampling".to_string());
            args.push("420".to_string());
            args.push("-p".to_string());
            args.push("2".to_string());
        } else {
            args.push("-d".to_string());
            args.push(self.settings.output.cjpegli_distance.to_string());
            args.push("-p".to_string());
            args.push("2".to_string());
        }
        
        // Execute cjpegli
        let output = create_windowless_command(cjpegli)
            .args(&args)
            .stdin(std::process::Stdio::piped())
            .spawn()
            .and_then(|mut child| {
                use std::io::Write;
                if let Some(mut stdin) = child.stdin.take() {
                    stdin.write_all(&ppm_data)?;
                }
                child.wait()
            })
            .map_err(|e| AppError::ProcessFailed(e.to_string()))?;
        
        if !output.success() {
            return Err(AppError::ProcessFailed("cjpegli failed".to_string()));
        }
        
        Ok(())
    }
    

    
    async fn apply_metadata(&self, output_path: &str) -> Result<()> {
        let exiftool = resolve_binary(&self.app, "exiftool")?;
        
        // Copy all EXIF from source to output
        let copy_output = create_windowless_command(&exiftool)
            .args([
                "-TagsFromFile",
                &self.item.source_path,
                "-all:all",
                "-overwrite_original",
                output_path,
            ])
            .output()
            .map_err(|e| AppError::ProcessFailed(e.to_string()))?;
        
        if !copy_output.status.success() {
            eprintln!("Warning: Failed to copy EXIF metadata");
        }
        
        // Write XMP marker for processed files (JPEG only)
        if matches!(self.settings.output.format, OutputFormat::Jpeg) {
            let mark_output = create_windowless_command(&exiftool)
                .args([
                    "-XMP:CreatorTool=HomeArchiveConverter",
                    "-XMP:Label=Processed",
                    "-overwrite_original",
                    output_path,
                ])
                .output()
                .map_err(|e| AppError::ProcessFailed(e.to_string()))?;
            
            if !mark_output.status.success() {
                eprintln!("Warning: Failed to write XMP marker");
            }
        }
        
        // Preserve timestamps
        if self.settings.advanced.preserve_timestamps {
            let source_meta = fs::metadata(&self.item.source_path)?;
            let mtime = source_meta.modified()?;
            let atime = source_meta.accessed().unwrap_or(mtime);
            
            filetime::set_file_times(
                output_path,
                filetime::FileTime::from_system_time(atime),
                filetime::FileTime::from_system_time(mtime),
            )?;
        }
        
        Ok(())
    }
    
    fn prepare_output_path(&self) -> Result<OutputInfo> {
        let ext = match self.settings.output.format {
            OutputFormat::Jpeg => "jpg",
        };
        
        let source_path = Path::new(&self.item.source_path);
        let base_name = source_path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| AppError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid filename"
            )))?;
        
        let directory = if self.settings.output.destination == "custom" {
            if let Some(ref custom_dir) = self.settings.output.custom_directory {
                let mut dir = PathBuf::from(custom_dir);
                
                if self.settings.output.keep_folder_structure {
                    let relative_dir = Path::new(&self.item.relative_path)
                        .parent()
                        .unwrap_or_else(|| Path::new(""));
                    dir = dir.join(relative_dir);
                }
                
                fs::create_dir_all(&dir)?;
                dir
            } else {
                source_path.parent().unwrap().to_path_buf()
            }
        } else {
            source_path.parent().unwrap().to_path_buf()
        };
        
        let target_path = directory
            .join(format!("{}.{}", base_name, ext))
            .to_string_lossy()
            .to_string();
        
        Ok(OutputInfo {
            target_path,
            should_copy_only: false,
        })
    }
    
    fn is_cancelled(&self) -> bool {
        self.cancel_flag.load(Ordering::SeqCst)
    }
}

struct OutputInfo {
    target_path: String,
    should_copy_only: bool,
}
