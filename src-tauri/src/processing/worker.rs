use crate::types::*;
use crate::utils::{AppError, Result};
use image::ImageReader;
use std::fs::{self, File};
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use zenjpeg::encoder::{ChromaSubsampling, EncoderConfig, PixelLayout, Quality};

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
            if let Some(mut g) = target_guard {
                g.disarm();
            }
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

                    // Delete original if requested
                    // Size comparison check
                    let temp_size = fs::metadata(&temp_path)?.len();
                    // Re-read source size to be sure, or use cached item size since we just read it for conversion
                    let source_size = self.item.size_bytes;

                    let use_original =
                        self.settings.advanced.size_compare && temp_size >= source_size;

                    if use_original {
                        if self.settings.output.destination == "source" {
                            // Replace mode: Do nothing (keep original)
                            // Temp file will be deleted by guard
                        } else {
                            // Save to folder mode: Copy original to target
                            fs::copy(&self.item.source_path, &output_info.target_path)?;
                            if let Some(mut g) = target_guard {
                                g.disarm();
                            }
                        }
                    } else {
                        // Delete original if requested
                        if self.settings.advanced.delete_originals {
                            let _ = trash::delete(&self.item.source_path);
                        }

                        // Disarm guard before atomic rename to prevent race condition
                        guard.disarm();

                        // Move temp to final location
                        fs::rename(&temp_path, &output_info.target_path)?;
                        if let Some(mut g) = target_guard {
                            g.disarm();
                        }
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

    fn detect_subsampling(&self) -> ChromaSubsampling {
        // If force 4:4:4 is enabled, always use None (no subsampling)
        if self.settings.output.force_subsampling_444 {
            return ChromaSubsampling::None;
        }

        // Default to 4:2:0 if detection fails/not a JPEG
        let default = ChromaSubsampling::Quarter;

        // Use buffered reading to avoid loading the entire file into memory
        let file = match File::open(&self.item.source_path) {
            Ok(f) => f,
            Err(_) => return default,
        };
        let mut reader = BufReader::new(file);

        // Check for JPEG magic number (FF D8)
        let mut header = [0u8; 2];
        if reader.read_exact(&mut header).is_err() || header != [0xFF, 0xD8] {
            return default;
        }

        // JPEG markers for Start of Frame (SOF)
        const SOF0: u8 = 0xC0;
        const SOF1: u8 = 0xC1;
        const SOF2: u8 = 0xC2;

        loop {
            // Find next marker (FF xx)
            let mut byte = [0u8; 1];

            // Skip non-FF bytes (though in valid JPEG, markers follow segments)
            // Ideally we jump by segment length, so let's try to follow the chain
            if reader.read_exact(&mut byte).is_err() {
                break;
            }
            if byte[0] != 0xFF {
                continue;
            }

            // Read marker type
            if reader.read_exact(&mut byte).is_err() {
                break;
            }
            let marker = byte[0];

            if marker == 0x00 || marker == 0xFF {
                continue;
            } // Stuffed FF or padding

            // Check if it's an SOF marker
            if marker == SOF0 || marker == SOF1 || marker == SOF2 {
                // Read length (2 bytes, big endian)
                let mut len_bytes = [0u8; 2];
                if reader.read_exact(&mut len_bytes).is_err() {
                    break;
                }
                let length = u16::from_be_bytes(len_bytes);

                // Length includes the length bytes themselves (2 bytes)
                // We need at least: Precision(1) + Height(2) + Width(2) + Components(1) = 6 bytes
                // Plus 3 bytes per component
                if length < 8 {
                    break;
                }

                let content_len = (length - 2) as usize;
                let mut content = vec![0u8; content_len];
                if reader.read_exact(&mut content).is_err() {
                    break;
                }

                // Parse SOF content
                // 0: Precision
                // 1-2: Height
                // 3-4: Width
                // 5: Number of components (Nf)
                if content.len() < 6 {
                    break;
                }
                let nf = content[5];

                if content.len() < (6 + nf as usize * 3) {
                    break;
                }

                if nf < 3 {
                    // Grayscale - no chroma subsampling
                    return ChromaSubsampling::None;
                }

                // Component info starts at index 6
                // Structure: [ID, SamplingFactors, QuantTableID]
                // Y (Component 0): index 6 + 0*3 = 6
                // Cb (Component 1): index 6 + 1*3 = 9
                // Cr (Component 2): index 6 + 2*3 = 12

                let y_h = (content[6 + 1] >> 4) & 0x0F;
                let y_v = content[6 + 1] & 0x0F;

                let cb_h = (content[9 + 1] >> 4) & 0x0F;
                let cb_v = content[9 + 1] & 0x0F;

                return if y_h == 1 && y_v == 1 {
                    ChromaSubsampling::None // All 1x1 (4:4:4)
                } else if y_h == 2 && y_v == 1 {
                    if cb_h == 1 && cb_v == 1 {
                        ChromaSubsampling::HalfHorizontal // 4:2:2
                    } else {
                        ChromaSubsampling::None
                    }
                } else if y_h == 2 && y_v == 2 {
                    if cb_h == 1 && cb_v == 1 {
                        ChromaSubsampling::Quarter // 4:2:0
                    } else {
                        ChromaSubsampling::None
                    }
                } else if y_h == 1 && y_v == 2 {
                    if cb_h == 1 && cb_v == 1 {
                        ChromaSubsampling::HalfVertical // 4:4:0
                    } else {
                        ChromaSubsampling::None
                    }
                } else {
                    ChromaSubsampling::None
                };
            } else {
                // Other marker, skip segment
                // Read length
                let mut len_bytes = [0u8; 2];
                if reader.read_exact(&mut len_bytes).is_err() {
                    break;
                }
                let length = u16::from_be_bytes(len_bytes);

                // Skip content
                if length > 2
                    && reader
                        .seek(SeekFrom::Current((length - 2) as i64))
                        .is_err()
                {
                    break;
                }
            }
        }

        default
    }

    async fn export_jpeg(&self, output_path: &str, subsampling: ChromaSubsampling) -> Result<()> {
        let distance = if self.settings.output.visually_lossless {
            1.0
        } else {
            self.settings.output.cjpegli_distance
        };
        let progressive = self.settings.output.progressive;
        let use_xyb = self.settings.output.use_xyb;

        let output_path_owned = output_path.to_string();
        let cancel_flag = self.cancel_flag.clone();
        let source_path = self.item.source_path.clone();
        let settings = self.settings.clone();

        // Use spawn_blocking for the heavy CPU task (loading, decoding, encoding, and metadata)
        tokio::task::spawn_blocking(move || {
            // Load image (detecting format by content, not extension)
            // This is a heavy blocking operation, must stay in spawn_blocking
            let img = ImageReader::open(&source_path)
                .map_err(AppError::Io)?
                .with_guessed_format()
                .map_err(AppError::Io)?
                .decode()
                .map_err(|e| AppError::ProcessFailed(format!("Image decoding failed: {:?}", e)))?;

            let rgb_img = img.to_rgb8();
            let (width, height) = rgb_img.dimensions();
            let raw_pixels = rgb_img.into_raw();

            // Configure encoder using zenjpeg API
            // Distance is passed directly to zenjpeg, wrapped in Quality::ApproxButteraugli
            let quality = Quality::ApproxButteraugli(distance.max(0.0));

            let config = if use_xyb {
                // XYB mode - only Full or BQuarter subsampling options available
                let xyb_subsampling = match subsampling {
                    ChromaSubsampling::None => zenjpeg::encoder::XybSubsampling::Full,
                    _ => zenjpeg::encoder::XybSubsampling::BQuarter,
                };
                EncoderConfig::xyb(quality, xyb_subsampling)
            } else {
                // Standard YCbCr mode
                EncoderConfig::ycbcr(quality, subsampling)
            };

            let config = config.progressive(progressive);

            // Create encoder from raw bytes
            let mut encoder = config
                .encode_from_bytes(width, height, PixelLayout::Rgb8Srgb)
                .map_err(|e| {
                    AppError::ProcessFailed(format!("Zenjpeg encoder creation failed: {:?}", e))
                })?;

            // Encode the image data with cancellation support
            // Create a wrapper that implements the Stop trait for AtomicBool
            struct CancelWrapper<'a>(&'a AtomicBool);
            impl<'a> zenjpeg::encoder::Stop for CancelWrapper<'a> {
                fn check(&self) -> std::result::Result<(), enough::StopReason> {
                    if self.0.load(Ordering::SeqCst) {
                        Err(enough::StopReason::Cancelled)
                    } else {
                        Ok(())
                    }
                }
            }

            encoder
                .push_packed(&raw_pixels, CancelWrapper(&cancel_flag))
                .map_err(|e| {
                    AppError::ProcessFailed(format!("Zenjpeg encoding failed: {:?}", e))
                })?;

            let mut jpeg_data = encoder
                .finish()
                .map_err(|e| AppError::ProcessFailed(format!("Zenjpeg finish failed: {:?}", e)))?;

            // Apply Metadata before writing to disk
            if !settings.output.strip_metadata {
                jpeg_data = Worker::apply_metadata_to_buffer(Path::new(&source_path), jpeg_data)?;
            }

            // Always add compression marker for detecting already processed files
            jpeg_data = Worker::add_compression_marker(jpeg_data)?;

            // Check cancellation right before writing to disk
            if cancel_flag.load(Ordering::SeqCst) {
                return Err(AppError::ProcessFailed(
                    "Cancelled during encoding".to_string(),
                ));
            }

            std::fs::write(&output_path_owned, jpeg_data)?;

            // Preserve timestamps (Last Modified / Accessed)
            if settings.advanced.preserve_timestamps {
                let source_meta = fs::metadata(&source_path)?;
                let mtime = source_meta.modified()?;
                let atime = source_meta.accessed().unwrap_or(mtime);

                filetime::set_file_times(
                    &output_path_owned,
                    filetime::FileTime::from_system_time(atime),
                    filetime::FileTime::from_system_time(mtime),
                )?;
            }

            Ok(())
        })
        .await
        .map_err(|e| AppError::ProcessFailed(format!("Task panicked: {:?}", e)))?
    }

    fn apply_metadata_to_buffer(source_path: &Path, output_bytes: Vec<u8>) -> Result<Vec<u8>> {
        use img_parts::jpeg::markers;
        use img_parts::{ImageEXIF, ImageICC};

        // 1. Read source
        let source_bytes = fs::read(source_path)?;

        let mut source_exif = None;
        let mut source_icc = None;
        let mut source_xmp = None; // APP1
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
                if marker == markers::APP1
                    && contents.starts_with(b"http://ns.adobe.com/xap/1.0/\0")
                {
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
        }

        let mut output_jpeg =
            img_parts::jpeg::Jpeg::from_bytes(output_bytes.into()).map_err(|e| {
                AppError::ProcessFailed(format!(
                    "Failed to parse output jpeg for metadata: {:?}",
                    e
                ))
            })?;

        // 2. Apply Metadata
        if let Some(exif_data) = source_exif {
            output_jpeg.set_exif(Some(exif_data.into()));
        }
        if let Some(icc_data) = source_icc {
            output_jpeg.set_icc_profile(Some(icc_data.into()));
        }

        let segments = output_jpeg.segments_mut();

        // Insert XMP if found
        if let Some(xmp_segment) = source_xmp {
            let mut insert_idx = 0;
            if !segments.is_empty() && segments[0].marker() == markers::APP0 {
                insert_idx = 1;
            }
            if let Some(pos) = segments
                .iter()
                .position(|s| s.marker() == markers::APP1 && s.contents().starts_with(b"Exif\0\0"))
            {
                insert_idx = pos + 1;
            }
            if insert_idx > segments.len() {
                insert_idx = segments.len();
            }
            segments.insert(insert_idx, xmp_segment);
        }

        // Insert IPTC if found
        if let Some(iptc_segment) = source_iptc {
            let mut insert_idx = 0;
            if !segments.is_empty() && segments[0].marker() == markers::APP0 {
                insert_idx += 1;
            }
            segments.insert(insert_idx, iptc_segment);
        }

        let mut result_buffer = Vec::new();
        output_jpeg
            .encoder()
            .write_to(&mut result_buffer)
            .map_err(|e| {
                AppError::ProcessFailed(format!("Failed to finalized metadata: {:?}", e))
            })?;

        Ok(result_buffer)
    }

    fn add_compression_marker(output_bytes: Vec<u8>) -> Result<Vec<u8>> {
        use img_parts::jpeg::markers;

        let mut output_jpeg =
            img_parts::jpeg::Jpeg::from_bytes(output_bytes.into()).map_err(|e| {
                AppError::ProcessFailed(format!("Failed to parse output jpeg: {:?}", e))
            })?;

        let comment_segment = img_parts::jpeg::JpegSegment::new_with_contents(
            markers::COM,
            img_parts::Bytes::from("Compressed by Jpeglic"),
        );

        let segments = output_jpeg.segments_mut();
        let mut com_insert_idx = 0;
        if !segments.is_empty() && segments[0].marker() == markers::APP0 {
            com_insert_idx = 1;
        }
        if com_insert_idx > segments.len() {
            com_insert_idx = segments.len();
        }
        segments.insert(com_insert_idx, comment_segment);

        let mut result_buffer = Vec::new();
        output_jpeg
            .encoder()
            .write_to(&mut result_buffer)
            .map_err(|e| AppError::ProcessFailed(format!("Failed to finalize: {:?}", e)))?;

        Ok(result_buffer)
    }

    fn prepare_output_path(&self) -> Result<OutputInfo> {
        let ext = match self.settings.output.format {
            OutputFormat::Jpeg => "jpg",
        };

        let source_path = Path::new(&self.item.source_path);
        let base_name = source_path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| {
                AppError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Invalid filename",
                ))
            })?;

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
                source_path
                    .parent()
                    .ok_or_else(|| {
                        AppError::ProcessFailed("Cannot determine parent directory".to_string())
                    })?
                    .to_path_buf()
            }
        } else {
            source_path
                .parent()
                .ok_or_else(|| {
                    AppError::ProcessFailed("Cannot determine parent directory".to_string())
                })?
                .to_path_buf()
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

            match fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&candidate)
            {
                Ok(_) => {
                    target_path = candidate;
                    was_claimed = true;
                    break;
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                    counter += 1;
                    if counter > 1000 {
                        return Err(AppError::ProcessFailed(
                            "Too many existing files with similar names".to_string(),
                        ));
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
