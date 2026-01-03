use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Jpeg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedSettings {
    pub concurrency: usize,
    pub preserve_metadata: bool,
    pub preserve_timestamps: bool,
    pub delete_originals: bool,
    pub skip_processed: bool,
    pub play_sound_on_finish: bool,
    pub sound_volume: u8,
    pub clear_input_after_conversion: bool,
    pub warn_before_replace: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputSettings {
    pub format: OutputFormat,
    pub keep_alpha: bool,
    pub destination: String, // "source" or "custom"
    pub custom_directory: Option<String>,
    pub keep_folder_structure: bool,
    pub visually_lossless: bool,
    pub cjpegli_distance: f32,
    pub force_subsampling_444: bool,
    pub use_xyb: bool,
    pub progressive: bool,
    pub strip_metadata: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub maximized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingSettings {
    pub output: OutputSettings,
    pub advanced: AdvancedSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub output: OutputSettings,
    pub advanced: AdvancedSettings,
    pub window: WindowSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputItem {
    pub id: String,
    pub source_path: String,
    pub display_name: String,
    pub relative_path: String,
    pub size_bytes: u64,
    pub last_modified: i64,
    pub is_processed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingRequest {
    pub items: Vec<InputItem>,
    pub settings: ProcessingSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingProgress {
    pub completed: usize,
    pub total: usize,
    pub current_item: Option<InputItem>,
    pub current_output_path: Option<String>,
    pub message: Option<String>,
    pub processed_item_id: Option<String>,
    pub saved_bytes: Option<u64>,
    pub active_item_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingError {
    pub item: InputItem,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingResult {
    pub success_count: usize,
    pub skipped_count: usize,
    pub failed_count: usize,
    pub errors: Vec<ProcessingError>,
    pub canceled: bool,
    pub saved_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStats {
    pub is_file: bool,
    pub is_directory: bool,
    pub size: u64,
    pub mtime: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub is_file: bool,
    pub is_directory: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewData {
    pub url: String,
    pub metadata: PreviewMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewMetadata {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format: Option<String>,
    pub size: Option<u64>,
    pub birthtime: Option<i64>,
    pub exif: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedStatus {
    pub path: String,
    pub is_processed: bool,
}
