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
    
    // Read file stats
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let size = metadata.len();
    let birthtime = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64);
    
    // Load and resize image
    let img = ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;
    
    let (width, height) = (img.width(), img.height());
    let format = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_uppercase());
    
    // Resize for preview (max 1200px)
    let thumbnail = img.thumbnail(1200, 1200);
    
    // Encode as JPEG base64
    let mut buffer = Vec::new();
    thumbnail
        .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;
    
    let base64_data = general_purpose::STANDARD.encode(&buffer);
    let data_url = format!("data:image/jpeg;base64,{}", base64_data);
    
    // Read EXIF data
    let mut exif_map = serde_json::Map::new();
    if let Ok(file) = std::fs::File::open(path) {
        let mut bufreader = std::io::BufReader::new(&file);
        let reader = exif::Reader::new();
        if let Ok(exif) = reader.read_from_container(&mut bufreader) {
            for field in exif.fields() {
                let tag = field.tag.to_string();
                let value = field.display_value().with_unit(&exif).to_string();
                
                // Map common tags to the names expected by the frontend
                let tag_name = format!("{:?}", field.tag);
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
                    _ => &tag,
                };
                
                exif_map.insert(key.to_string(), serde_json::Value::String(value));
            }
        }
    }
    
    Ok(PreviewData {
        data: data_url,
        metadata: PreviewMetadata {
            width: Some(width),
            height: Some(height),
            format,
            size: Some(size),
            birthtime,
            exif: if exif_map.is_empty() { None } else { Some(serde_json::Value::Object(exif_map)) },
        },
    })
}
