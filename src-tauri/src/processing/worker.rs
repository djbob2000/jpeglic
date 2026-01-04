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
        if self.settings.advanced.skip_processed && !self.settings.advanced.recompress_optimized {
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
                    // Size comparison check
                    let temp_size = fs::metadata(&temp_path)?.len();
                    // Re-read source size to be sure, or use cached item size since we just read it for conversion
                    let source_size = self.item.size_bytes;
                    
                    let use_original = self.settings.advanced.size_compare && temp_size >= source_size;
                    
                    if use_original {
                         if self.settings.output.destination == "source" {
                             // Replace mode: Do nothing (keep original)
                             // Temp file will be deleted by guard
                         } else {
                             // Save to folder mode: Copy original to target
                             fs::copy(&self.item.source_path, &output_info.target_path)?;
                             if let Some(mut g) = target_guard { g.disarm(); }
                         }
                    } else {
                        // Delete original if requested
                        if self.settings.advanced.delete_originals {
                            let _ = trash::delete(&self.item.source_path);
                        }
                        
                        // Move temp to final location
                        fs::rename(&temp_path, &output_info.target_path)?;
                        guard.disarm();
                        if let Some(mut g) = target_guard { g.disarm(); }
                    }
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
        let subsampling = self.detect_subsampling();
        match self.settings.output.format {
            OutputFormat::Jpeg => self.export_jpeg(output_path, subsampling).await,
        }
    }

    fn detect_subsampling(&self) -> jpegli::Subsampling {
        // If force 4:4:4 is enabled, always use S444
        if self.settings.output.force_subsampling_444 {
            return jpegli::Subsampling::S444;
        }

        // Default to 4:2:0 if detection fails/not a JPEG
        let default = jpegli::Subsampling::S420;

        let Ok(bytes) = std::fs::read(&self.item.source_path) else {
            return default;
        };

        let Ok(jpeg) = img_parts::jpeg::Jpeg::from_bytes(bytes.into()) else {
            return default;
        };

        // JPEG markers for Start of Frame (SOF)
        // SOF0 (Baseline), SOF1 (Extended Sequential), SOF2 (Progressive)
        const SOF0: u8 = 0xC0;
        const SOF1: u8 = 0xC1;
        const SOF2: u8 = 0xC2;

        for segment in jpeg.segments() {
            let marker = segment.marker();
            if marker == SOF0 || marker == SOF1 || marker == SOF2 {
                let contents = segment.contents();
                // SOF segment structure:
                // 1 byte: Precision
                // 2 bytes: Height
                // 2 bytes: Width
                // 1 byte: Number of components (Nf)
                // For each component:
                //   1 byte: Component ID
                //   1 byte: Sampling factors (Hi, Vi) - high 4 bits H, low 4 bits V
                //   1 byte: Quantization table ID
                if contents.len() < 6 { continue; }
                let nf = contents[5];
                if contents.len() < (6 + nf as usize * 3) { continue; }

                if nf < 3 {
                    // Grayscale usually doesn't have subsampling in the same sense, or it's 4:0:0
                    return jpegli::Subsampling::S444; 
                }

                // We care about the first component (Y) relative to others
                let y_h = (contents[7] >> 4) & 0x0F;
                let y_v = contents[7] & 0x0F;
                
                let cb_h = (contents[10] >> 4) & 0x0F;
                let cb_v = contents[10] & 0x0F;

                // Cr sampling factors should be same as Cb in standard JPEGs
                
                return if y_h == 1 && y_v == 1 {
                    jpegli::Subsampling::S444 // All 1x1
                } else if y_h == 2 && y_v == 1 {
                    if cb_h == 1 && cb_v == 1 {
                        jpegli::Subsampling::S422
                    } else {
                        jpegli::Subsampling::S444
                    }
                } else if y_h == 2 && y_v == 2 {
                    if cb_h == 1 && cb_v == 1 {
                        jpegli::Subsampling::S420
                    } else {
                        jpegli::Subsampling::S444
                    }
                } else if y_h == 1 && y_v == 2 {
                    if cb_h == 1 && cb_v == 1 {
                        jpegli::Subsampling::S440
                    } else {
                        jpegli::Subsampling::S444
                    }
                } else {
                    jpegli::Subsampling::S444
                };
            }
        }

        default
    }
    
    async fn export_jpeg(&self, output_path: &str, subsampling: jpegli::Subsampling) -> Result<()> {
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
        
        let progressive = self.settings.output.progressive;
        let use_xyb = self.settings.output.use_xyb; 
        
        let raw_pixels = rgb_img.into_raw();
        let output_path_owned = output_path.to_string();
        let cancel_flag = self.cancel_flag.clone();

        // Use spawn_blocking for the heavy CPU task
        tokio::task::spawn_blocking(move || {
            // Configure encoder
            let mut encoder = jpegli::Encoder::new()
                .width(width)
                .height(height);
            
            if progressive {
                 // TODO: progressive_level API missing in jpegli-rs 0.3.0
                 eprintln!("Warning: Progressive mode requested but API not available");
            }

            if use_xyb {
                // TODO: xyb API missing in jpegli-rs 0.3.0
                eprintln!("Warning: XYB mode requested but API not available");
            }


            encoder = encoder.quality(jpegli::Quality::Distance(distance))
                .subsampling(subsampling);

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
        // 0. Check if stripping metadata is requested
        if self.settings.output.strip_metadata {
            return Ok(());
        }

        use img_parts::{ImageEXIF, ImageICC};
        use img_parts::jpeg::markers;

        // 1. Read source and output
        let source_bytes = fs::read(&self.item.source_path)?; 
        let output_bytes = fs::read(output_path)?;

        let mut source_exif = None;
        let mut source_icc = None;
        let mut source_xmp = None;  // APP1
        let mut source_iptc = None; // APP13

        // Try to extract metadata from JPEG source
        if let Ok(jpeg) = img_parts::jpeg::Jpeg::from_bytes(source_bytes.clone().into()) {
            source_exif = jpeg.exif().map(|b| b.to_vec());
            source_icc = jpeg.icc_profile().map(|b| b.to_vec());
            
            // Extract XMP and IPTC manually from segments
            for segment in jpeg.segments() {
                let marker = segment.marker();
                let contents = segment.contents();
                
                // XMP is in APP1
                if marker == markers::APP1 && contents.starts_with(b"http://ns.adobe.com/xap/1.0/\0") {
                    source_xmp = Some(segment.clone());
                }
                
                // IPTC is in APP13
                if marker == markers::APP13 && contents.starts_with(b"Photoshop 3.0\0") {
                    source_iptc = Some(segment.clone());
                }
            }
        } 
        // Try to extract from PNG source (basic support)
        else if let Ok(png) = img_parts::png::Png::from_bytes(source_bytes.into()) {
            source_icc = png.icc_profile().map(|b| b.to_vec());
            // PNG XMP extraction is more complex with img-parts, skipping for now as per previous logic,
            // but we could add it later if needed.
        }

        let mut output_jpeg = img_parts::jpeg::Jpeg::from_bytes(output_bytes.into())
            .map_err(|e| AppError::ProcessFailed(format!("Failed to parse output jpeg for metadata: {:?}", e)))?;

        // 2. Apply Metadata
        
        // EXIF
        if let Some(exif_data) = source_exif {
            output_jpeg.set_exif(Some(exif_data.into()));
        }

        // ICC Profile
        if let Some(icc_data) = source_icc {
            output_jpeg.set_icc_profile(Some(icc_data.into()));
        }
        
        // We act on segments list for others
        let segments = output_jpeg.segments_mut();
        
        // Remove existing APP1 (XMP) and APP13 (IPTC) generated by encoder (if any) to clean slate
        // Although Jpegli defaults mostly clean, safe to ensure insert order
        // Actually, set_exif/set_icc handle their own segments.
        
        // Insert XMP if found (usually after EXIF)
        if let Some(xmp_segment) = source_xmp {
             let mut insert_idx = 0;
             if !segments.is_empty() && segments[0].marker() == markers::APP0 {
                 insert_idx = 1;
             }
             
             // Insert after EXIF if present
             if let Some(pos) = segments.iter().position(|s| s.marker() == markers::APP1 && s.contents().starts_with(b"Exif\0\0")) {
                 insert_idx = pos + 1;
             }
             
             if insert_idx > segments.len() { insert_idx = segments.len(); }
             segments.insert(insert_idx, xmp_segment);
        }

        // Insert IPTC if found
        if let Some(iptc_segment) = source_iptc {
             let mut insert_idx = 0;
             if !segments.is_empty() && segments[0].marker() == markers::APP0 { insert_idx += 1; }
             segments.insert(insert_idx, iptc_segment);
        }

        // 3. Add Compressed by Jpeglic comment
        let comment_segment = img_parts::jpeg::JpegSegment::new_with_contents(
            markers::COM,
            img_parts::Bytes::from("Compressed by Jpeglic"),
        );
        
        // Insert comment early in header
        let mut com_insert_idx = 0;
        if !segments.is_empty() && segments[0].marker() == markers::APP0 {
            com_insert_idx = 1;
        }
        if com_insert_idx > segments.len() { com_insert_idx = segments.len(); }
        segments.insert(com_insert_idx, comment_segment);

        let mut final_file = fs::File::create(output_path)?;
        output_jpeg.encoder().write_to(&mut final_file)
            .map_err(|e| AppError::ProcessFailed(format!("Failed to save metadata: {:?}", e)))?;
        
        // Preserve timestamps (Last Modified / Accessed)
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
