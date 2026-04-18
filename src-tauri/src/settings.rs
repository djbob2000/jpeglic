use crate::types::{AppSettings, AdvancedSettings, OutputSettings, WindowSettings, OutputFormat};
use crate::utils::Result;

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub struct SettingsManager {
    config_path: PathBuf,
    settings: Arc<Mutex<AppSettings>>,
}

impl SettingsManager {
    pub fn new(app: AppHandle) -> Result<Self> {
        let config_dir = app.path().app_data_dir()?;
        fs::create_dir_all(&config_dir)?;
        
        let config_path = config_dir.join("config.json");
        let settings = if config_path.exists() {
            let data = fs::read_to_string(&config_path)?;
            serde_json::from_str(&data).unwrap_or_else(|_| Self::default_settings())
        } else {
            Self::default_settings()
        };
        
        Ok(Self {
            config_path,
            settings: Arc::new(Mutex::new(settings)),
        })
    }
    
    fn default_settings() -> AppSettings {
        
        AppSettings {
            output: OutputSettings {
                format: OutputFormat::Jpeg,
                keep_alpha: false,
                destination: "source".to_string(),
                custom_directory: None,
                keep_folder_structure: true,
                visually_lossless: false,
                cjpegli_distance: 1.5,
                force_subsampling_444: false,
                use_xyb: false,
                progressive: false,
                strip_metadata: false,
            },
            advanced: AdvancedSettings {
                concurrency: 2,
                preserve_metadata: true,
                preserve_timestamps: true,
                delete_originals: false,
                skip_processed: true,
                play_sound_on_finish: false,
                sound_volume: 100,
                clear_input_after_conversion: false,
                warn_before_replace: true,
                recompress_optimized: false,
                size_compare: false,
            },
            window: WindowSettings {
                width: 900,
                height: 600,
                x: None,
                y: None,
                maximized: false,
            },
        }
    }
    
    pub fn get(&self) -> Result<AppSettings> {
        Ok(self.settings.lock().unwrap().clone())
    }
    
    pub fn save(&self, settings: AppSettings) -> Result<()> {
        *self.settings.lock().unwrap() = settings.clone();
        let json = serde_json::to_string_pretty(&settings)?;
        fs::write(&self.config_path, json)?;
        Ok(())
    }
    
    pub fn reset(&self) -> Result<()> {
        let defaults = Self::default_settings();
        self.save(defaults)
    }
}
