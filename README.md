# XL Converter (Electron + TypeScript)

Easy-to-use image converter for modern formats, built with Electron and TypeScript.

> **Note:** This is a complete rewrite from Python/PySide6 to TypeScript/Electron. See [MIGRATION.md](MIGRATION.md) for details.

## Features

#### Modern Image Formats

Convert images between **JPEG XL**, **AVIF**, **WebP**, **JPEG**, and **PNG** formats with optimal compression.

#### Parallel Processing

Process multiple images simultaneously for faster batch conversions.

#### Flexible Downscaling

Scale images by dimensions, percentage, longest/shortest side, or megapixels.

#### Metadata Preservation

Keep EXIF metadata and file timestamps intact during conversion.

#### Smart File Handling

Choose to overwrite, skip, or automatically rename duplicate files.

#### Settings Persistence

Automatically saves your preferences using `electron-store`, so your workflow continues where you left off.

#### Auto-Updates

Integrated with `electron-updater` to check for new releases, download them, and install on restart.

#### Custom Titlebar

A native-inspired titlebar with window controls that keeps the content area consistent across platforms.

#### Live Preview

Preview input images directly inside the app, with React-powered components for richer interactivity.

## Technology Stack

- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript
- **Sharp** - High-performance image processing (libvips-based)
- **External Encoders**:
  - `cjxl` (libjxl) for JPEG XL encoding
  - Native Sharp support for AVIF, WebP, JPEG, PNG

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- External encoder binaries (optional, for JPEG XL):
  - `cjxl` for JPEG XL encoding

### Install Dependencies

```bash
npm install
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

## Packaging

### Package for Current Platform

```bash
npm run package
```

### Package for Specific Platforms

```bash
npm run package:win    # Windows
npm run package:linux  # Linux
npm run package:mac    # macOS
```

Packaged apps will be in the `release/` directory.

## Project Structure

```
src/
├── main.ts              # Electron main process entry point
├── preload.ts           # Preload script for IPC bridge
├── common/
│   └── types.ts         # Shared TypeScript types
├── main/
│   ├── controller.ts    # Processing orchestration
│   ├── worker.ts        # Image conversion worker
│   └── process-manager.ts  # External process management
└── renderer/
    ├── index.html       # UI structure
    ├── styles.css       # Application styles
    └── app.ts           # Frontend logic
```

## Configuration

### Output Formats

- **JPEG XL** - Best compression, modern format
- **AVIF** - Excellent compression, broad support
- **WebP** - Good compression, universal support
- **JPEG** - Classic format with MozJPEG optimization
- **PNG** - Lossless with high compression

### Downscaling Modes

- **None** - Keep original dimensions
- **Dimensions** - Resize to specific width × height
- **Percentage** - Scale by percentage (e.g., 50%)
- **Longer Side** - Resize based on longer dimension
- **Shorter Side** - Resize based on shorter dimension
- **Megapixels** - Target specific megapixel count

### Advanced Settings

- **Concurrency** - Number of parallel conversions (auto-detected)
- **Preserve Metadata** - Always enabled (keeps EXIF data)
- **Preserve Timestamps** - Always enabled (maintains file dates)
- **Delete Originals** - Remove source files after conversion
- **Skip Processed** - Always enabled (skips already compressed files)

## External Dependencies

### Required for JPEG XL

If you want JPEG XL support, install libjxl:

**Ubuntu/Debian:**
```bash
sudo apt install libjxl-tools
```

**macOS (Homebrew):**
```bash
brew install jpeg-xl
```

**Windows:**
Download from [libjxl releases](https://github.com/libjxl/libjxl/releases) and add to PATH.

### Built-in via Sharp

The following formats are natively supported through Sharp:
- AVIF
- WebP
- JPEG (with MozJPEG)
- PNG

## License

See [LICENSE.txt](LICENSE.txt) for details.

## Third-Party Licenses

See [LICENSE_3RD_PARTY.txt](LICENSE_3RD_PARTY.txt) for dependencies.
