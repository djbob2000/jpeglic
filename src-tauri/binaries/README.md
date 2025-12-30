# Binaries Directory

This directory contains platform-specific binaries for:
- **cjpegli**: JPEG encoder
- **exiftool**: EXIF metadata tool

## Structure

```
binaries/
├── cjpegli-x86_64-pc-windows-msvc.exe    # Windows
├── cjpegli-x86_64-apple-darwin           # macOS Intel
├── cjpegli-aarch64-apple-darwin          # macOS Apple Silicon
├── cjpegli-x86_64-unknown-linux-gnu      # Linux
├── exiftool-x86_64-pc-windows-msvc.exe   # Windows
├── exiftool-x86_64-apple-darwin          # macOS Intel
├── exiftool-aarch64-apple-darwin         # macOS Apple Silicon
└── exiftool-x86_64-unknown-linux-gnu     # Linux
```

## TODO

1. Copy existing `cjpegli.exe` from `binaries/win/` to `src-tauri/binaries/cjpegli-x86_64-pc-windows-msvc.exe`
2. Download/build cjpegli for macOS and Linux
3. Download exiftool binaries for all platforms from https://exiftool.org/

## Notes

- Tauri will automatically select the correct binary based on the target platform
- Binaries must be executable on Unix systems (`chmod +x`)
