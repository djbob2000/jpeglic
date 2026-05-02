use crate::types::{PreviewData, PreviewMetadata};
use base64::{engine::general_purpose, Engine as _};
use exif;
use image::ImageReader;
use serde_json;
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn get_preview(file_path: String) -> Result<PreviewData, String> {
    tokio::task::spawn_blocking(move || {
        let path = Path::new(&file_path);

        // 1. Fast file metadata retrieval
        let fs_metadata = fs::metadata(path).map_err(|e| e.to_string())?;
        let size = fs_metadata.len();
        let birthtime = fs_metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        let format_ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();

        // 2. Fast dimension retrieval without full decoding
        let (width, height) = match ImageReader::open(path)
            .map_err(|e| e.to_string())?
            .into_dimensions()
        {
            Ok(dim) => (Some(dim.0), Some(dim.1)),
            Err(_) => (None, None),
        };

        // 3. Try to extract Embedded Thumbnail & EXIF using streaming readers
        let mut thumbnail_data = None;
        let mut exif_map = serde_json::Map::new();
        let mut exif_extraction_result = None;

        // Use streaming reader for EXIF (much faster than reading whole file)
        if let Ok(file) = std::fs::File::open(path) {
            let mut bufreader = std::io::BufReader::new(&file);
            let reader = exif::Reader::new();
            if let Ok(exif_data) = reader.read_from_container(&mut bufreader) {
                exif_extraction_result = Some(exif_data);
            }
        }

        if let Some(exif_data) = exif_extraction_result {
            // Collect EXIF metadata
            for field in exif_data.fields() {
                let value = field.display_value().with_unit(&exif_data).to_string();

                let key = match field.tag {
                    exif::Tag::DateTimeOriginal => "DateTimeOriginal".to_string(),
                    exif::Tag::DateTimeDigitized => "CreateDate".to_string(),
                    exif::Tag::DateTime => "ModifyDate".to_string(),
                    exif::Tag::Make => "Make".to_string(),
                    exif::Tag::Model => "Model".to_string(),
                    exif::Tag::FNumber => "FNumber".to_string(),
                    exif::Tag::ApertureValue => "ApertureValue".to_string(),
                    exif::Tag::ExposureTime => "ExposureTime".to_string(),
                    exif::Tag::ShutterSpeedValue => "ShutterSpeedValue".to_string(),
                    exif::Tag::ISOSpeed | exif::Tag::PhotographicSensitivity => "ISO".to_string(),
                    exif::Tag::LensModel => "LensModel".to_string(),
                    exif::Tag::LensMake => "LensMake".to_string(),
                    exif::Tag::LensSpecification => "Lens".to_string(),
                    exif::Tag::FocalLength => "FocalLength".to_string(),
                    exif::Tag::ExposureBiasValue => "ExposureBias".to_string(),
                    exif::Tag::Flash => "Flash".to_string(),
                    exif::Tag::WhiteBalance => "WhiteBalance".to_string(),
                    exif::Tag::ColorSpace => "ColorSpace".to_string(),
                    _ => format!("{:?}", field.tag),
                };
                exif_map.insert(key, serde_json::Value::String(value));
            }

            // Try to find JPEG thumbnail in EXIF
            if let Some(field) =
                exif_data.get_field(exif::Tag::JPEGInterchangeFormat, exif::In::THUMBNAIL)
            {
                if let Some(offset) = field.value.get_uint(0) {
                    if let Some(len_field) = exif_data
                        .get_field(exif::Tag::JPEGInterchangeFormatLength, exif::In::THUMBNAIL)
                    {
                        if let Some(len) = len_field.value.get_uint(0) {
                            use std::io::{Read, Seek, SeekFrom};
                            let mut file = std::fs::File::open(path).map_err(|e| e.to_string())?;
                            file.seek(SeekFrom::Start(offset as u64))
                                .map_err(|e| e.to_string())?;
                            let mut buffer = vec![0; len as usize];
                            if file.read_exact(&mut buffer).is_ok() {
                                thumbnail_data = Some(buffer);
                            }
                        }
                    }
                }
            }
        }

        // 4. Determine image source logic (Native URL vs Base64)
        let url = if matches!(
            format_ext.as_str(),
            "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "svg"
        ) {
            // GPU NATIVE: Return the file path itself.
            file_path
        } else if let Some(thumb) = thumbnail_data {
            // Use embedded thumbnail from EXIF (for RAW files)
            let base64_data = general_purpose::STANDARD.encode(&thumb);
            format!("data:image/jpeg;base64,{}", base64_data)
        } else {
            // Fallback: full decode and resize (only for RAW/TIFF/HEIC without thumbnail)
            let img = ImageReader::open(path)
                .map_err(|e| e.to_string())?
                .decode()
                .map_err(|e| e.to_string())?;

            let thumbnail = img.thumbnail(1200, 1200);
            let mut buffer = Vec::new();
            thumbnail
                .write_to(
                    &mut std::io::Cursor::new(&mut buffer),
                    image::ImageFormat::Jpeg,
                )
                .map_err(|e| e.to_string())?;

            let base64_data = general_purpose::STANDARD.encode(&buffer);
            format!("data:image/jpeg;base64,{}", base64_data)
        };

        Ok(PreviewData {
            url,
            metadata: PreviewMetadata {
                width,
                height,
                format: Some(format_ext.to_uppercase()),
                size: Some(size),
                birthtime,
                exif: if exif_map.is_empty() {
                    None
                } else {
                    Some(serde_json::Value::Object(exif_map))
                },
            },
        })
    })
    .await
    .map_err(|e| format!("Preview task panicked: {:?}", e))?
}
