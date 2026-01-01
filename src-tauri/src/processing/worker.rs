use crate::types::*;
use crate::utils::{AppError, Result};
use image::ImageReader;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct Worker {
    item: InputItem,
    settings: ProcessingSettings,
    cancel_flag: Arc<AtomicBool>,
    #[allow(dead_code)]
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

/// A guard that deletes a file when dropped, unless disarmed.
struct TempFileGuard {
    path: String,
    active: bool,
}

impl TempFileGuard {
    fn new(path: String) -> Self {
        Self { path, active: true }
    }
    fn disarm(&mut self) {
        self.active = false;
    }
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if self.active {
            let _ = std::fs::remove_file(&self.path);
        }
    }
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
        let target_guard = if output_info.was_claimed {
            Some(TempFileGuard::new(output_info.target_path.clone()))
        } else {
            None
        };
        
        if output_info.should_copy_only {
            // Just copy the file
            fs::copy(&self.item.source_path, &output_info.target_path)?;
            if let Some(mut g) = target_guard { g.disarm(); }
        } else {
            // Convert the image
            let temp_path = format!("{}.{}.tmp", output_info.target_path, uuid::Uuid::new_v4());
            let mut guard = TempFileGuard::new(temp_path.clone());
            
            match self.convert_image(&temp_path).await {
                Ok(_) => {
                    // Check cancellation before heavy metadata operations
                    if self.is_cancelled() {
                        return Err(AppError::ProcessFailed("Cancelled".to_string()));
                    }

                    // Apply metadata
                    self.apply_metadata(&temp_path).await?;
                    
                    // Delete original if requested
                    if self.settings.advanced.delete_originals {
                        let _ = trash::delete(&self.item.source_path);
                    }
                    
                    // Move temp to final location
                    fs::rename(&temp_path, &output_info.target_path)?;
                    guard.disarm();
                    if let Some(mut g) = target_guard { g.disarm(); }
                }
                Err(e) => {
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
        // Load image (detecting format by content, not extension)
        let img = ImageReader::open(&self.item.source_path)?
            .with_guessed_format()?
            .decode()?;
        let rgb_img = img.to_rgb8();
        let (width, height) = rgb_img.dimensions();

        let distance = if self.settings.output.visually_lossless {
            1.0
        } else {
            self.settings.output.cjpegli_distance
        };
        
        let raw_pixels = rgb_img.into_raw();
        let output_path_owned = output_path.to_string();
        let cancel_flag = self.cancel_flag.clone();

        // Use spawn_blocking for the heavy CPU task
        tokio::task::spawn_blocking(move || {
            // Configure encoder
            let mut encoder = jpegli::Encoder::new()
                .width(width)
                .height(height);
            
            encoder = encoder.quality(jpegli::Quality::Distance(distance))
                             .subsampling(jpegli::Subsampling::S420);

            // Encode
            let result = encoder.encode(&raw_pixels)
                .map_err(|e| AppError::ProcessFailed(format!("Jpegli encoding failed: {:?}", e)))?;
                
            // Check cancellation right before writing to disk
            if cancel_flag.load(Ordering::SeqCst) {
                return Err(AppError::ProcessFailed("Cancelled during encoding".to_string()));
            }

            std::fs::write(output_path_owned, result)?;
            
            Ok(())
        }).await.map_err(|e| AppError::ProcessFailed(format!("Task panicked: {:?}", e)))?
    }
    

    
    async fn apply_metadata(&self, output_path: &str) -> Result<()> {
        use img_parts::ImageEXIF;

        // 1. Copy EXIF and apply XMP using img-parts and xmp-writer
        let source_bytes = fs::read(&self.item.source_path)?; 
        let output_bytes = fs::read(output_path)?;

        let source_jpeg = img_parts::jpeg::Jpeg::from_bytes(source_bytes.into())
            .map_err(|e| AppError::ProcessFailed(format!("Failed to parse source jpeg for metadata: {:?}", e)));

        // Handle source parsing gracefully
        let source_exif = if let Ok(jpeg) = source_jpeg {
            jpeg.exif().map(|b| b.to_vec())
        } else {
            None
        };

        let mut output_jpeg = img_parts::jpeg::Jpeg::from_bytes(output_bytes.into())
            .map_err(|e| AppError::ProcessFailed(format!("Failed to parse output jpeg for metadata: {:?}", e)))?;

        // Process EXIF
        if let Some(exif_data) = source_exif {
            output_jpeg.set_exif(Some(exif_data.into()));
        }

        // Process XMP (App1 "http://ns.adobe.com/xap/1.0/")
        if matches!(self.settings.output.format, OutputFormat::Jpeg) {
            let mut writer = xmp_writer::XmpWriter::new();
            writer.creator_tool("Jpeglic");
            writer.label("Processed");
            let xmp_xml = writer.finish(None);
            
            // Standard XMP packet wrapper
            let xmp_packet = format!(
                "<?xpacket begin=\"\u{FEFF}\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>\n{}<?xpacket end=\"w\"?>",
                xmp_xml
            );

            // Construct valid APP1 XMP segment
            // Header: http://ns.adobe.com/xap/1.0/\0
            let header = b"http://ns.adobe.com/xap/1.0/\0";
            let mut xmp_segment_data = Vec::with_capacity(header.len() + xmp_packet.len());
            xmp_segment_data.extend_from_slice(header);
            xmp_segment_data.extend_from_slice(xmp_packet.as_bytes());

            let segment = img_parts::jpeg::JpegSegment::new_with_contents(
                img_parts::jpeg::markers::APP1,
                img_parts::Bytes::from(xmp_segment_data),
            );

            // Safe insertion: if first segment is APP0 (JFIF), insert after it.
            // JFIF must be the first segment if present.
            let segments = output_jpeg.segments_mut();
            if !segments.is_empty() && segments[0].marker() == img_parts::jpeg::markers::APP0 {
                segments.insert(1, segment);
            } else {
                segments.insert(0, segment);
            }
        }

        let mut final_file = fs::File::create(output_path)?;
        output_jpeg.encoder().write_to(&mut final_file)
            .map_err(|e| AppError::ProcessFailed(format!("Failed to save metadata: {:?}", e)))?;
        
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
        
        let target_path;
        let source_path_os = Path::new(&self.item.source_path);
        let mut was_claimed = false;
        let mut counter = 0;

        loop {
            let candidate = if counter == 0 {
                directory.join(format!("{}.{}", base_name, ext))
            } else {
                directory.join(format!("{} ({}).{}", base_name, counter, ext))
            };

            // If it's the source path, we don't claim it (it already exists and we want to allow replacing it)
            if candidate == source_path_os {
                target_path = candidate;
                break;
            }

            match fs::OpenOptions::new().write(true).create_new(true).open(&candidate) {
                Ok(_) => {
                    target_path = candidate;
                    was_claimed = true;
                    break;
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                    counter += 1;
                    if counter > 1000 {
                        return Err(AppError::ProcessFailed("Too many existing files with similar names".to_string()));
                    }
                }
                Err(e) => return Err(e.into()),
            }
        }
        
        let target_path_str = target_path.to_string_lossy().to_string();
        
        Ok(OutputInfo {
            target_path: target_path_str,
            should_copy_only: false,
            was_claimed,
        })
    }
    
    fn is_cancelled(&self) -> bool {
        self.cancel_flag.load(Ordering::SeqCst)
    }
}

struct OutputInfo {
    target_path: String,
    should_copy_only: bool,
    was_claimed: bool,
}



