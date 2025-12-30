use crate::types::{PreviewData, PreviewMetadata};
use image::ImageReader;
use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};
use exif;
use serde_json;

#[tauri::command]
pub async fn get_preview(file_path: String) -> Result<PreviewData, String> {
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
    let (width, height) = match ImageReader::open(path).map_err(|e| e.to_string())?.into_dimensions() {
        Ok(dim) => (Some(dim.0), Some(dim.1)),
        Err(_) => (None, None),
    };

    // 3. Try to extract Embedded Thumbnail
    let mut thumbnail_data = None;
    let mut exif_map = serde_json::Map::new();

    if let Ok(file) = std::fs::File::open(path) {
        let mut bufreader = std::io::BufReader::new(&file);
        let reader = exif::Reader::new();
        if let Ok(exif_data) = reader.read_from_container(&mut bufreader) {
            // Collect EXIF metadata
            for field in exif_data.fields() {
                let tag_name = format!("{:?}", field.tag);
                let value = field.display_value().with_unit(&exif_data).to_string();
                
                let key = match tag_name.as_str() {
                    "DateTimeOriginal" => "DateTimeOriginal",
                    "DateTimeDigitized" => "CreateDate",
                    "DateTime" => "ModifyDate",
                    "Make" => "Make",
                    "Model" => "Model",
                    "FNumber" => "FNumber",
                    "ExposureTime" => "ExposureTime",
                    "ISOSpeedRatings" | "ISOSpeed" => "ISO",
                    "LensModel" => "LensModel",
                    "LensMake" => "LensMake",
                    "LensSpecification" => "Lens",
                    _ => tag_name.as_str(),
                };
                exif_map.insert(key.to_string(), serde_json::Value::String(value));
            }

            // Try to find JPEG thumbnail in EXIF
            if let Some(field) = exif_data.get_field(exif::Tag::JPEGInterchangeFormat, exif::In::THUMBNAIL) {
                if let Some(offset) = field.value.get_uint(0) {
                    if let Some(len_field) = exif_data.get_field(exif::Tag::JPEGInterchangeFormatLength, exif::In::THUMBNAIL) {
                        if let Some(len) = len_field.value.get_uint(0) {
                            use std::io::{Read, Seek, SeekFrom};
                            let mut file = std::fs::File::open(path).map_err(|e| e.to_string())?;
                            file.seek(SeekFrom::Start(offset as u64)).map_err(|e| e.to_string())?;
                            let mut buffer = vec![0; len as usize];
                            if file.read_exact(&mut buffer).is_ok() {
                                thumbnail_data = Some(buffer);
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Determine image source logic
    let data_url = if matches!(format_ext.as_str(), "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "svg") {
        // SUPER FAST: Read raw file bytes directly. Let the browser decode it!
        // No heavy image::decode() in Rust.
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
        let base64_data = general_purpose::STANDARD.encode(&bytes);
        let mime_type = match format_ext.as_str() {
            "png" => "image/png",
            "webp" => "image/webp",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "bmp" => "image/bmp",
            _ => "image/jpeg",
        };
        format!("data:{};base64,{}", mime_type, base64_data)
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
            .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
        
        let base64_data = general_purpose::STANDARD.encode(&buffer);
        format!("data:image/jpeg;base64,{}", base64_data)
    };

    Ok(PreviewData {
        data: data_url,
        metadata: PreviewMetadata {
            width,
            height,
            format: Some(format_ext.to_uppercase()),
            size: Some(size),
            birthtime,
            exif: if exif_map.is_empty() { None } else { Some(serde_json::Value::Object(exif_map)) },
        },
    })
}
