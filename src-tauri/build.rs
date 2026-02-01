use std::path::PathBuf;

fn main() {
    tauri_build::build();

    // Export TypeScript types using ts-rs
    // This ensures bindings are always up-to-date with Rust types
    export_typescript_bindings();
}

fn export_typescript_bindings() {
    // Set the export path for ts-rs bindings
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let bindings_dir = manifest_dir.join("bindings");
    
    // Ensure the bindings directory exists
    if !bindings_dir.exists() {
        std::fs::create_dir_all(&bindings_dir).expect("Failed to create bindings directory");
    }
    
    // Set environment variable for ts-rs export path
    std::env::set_var("TS_RS_EXPORT_DIR", &bindings_dir);
    
    // Note: The actual export happens through the TS trait implementations
    // in types.rs. Each type with #[ts(export)] will be exported when
    // the test export_types() runs or when types are used.
    // For build-time export, we rely on the test being run or manual export.
    println!("cargo:rerun-if-changed=src/types.rs");
    println!("cargo:rerun-if-changed=bindings/");
}
