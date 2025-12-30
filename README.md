# Jpeglic • Best Jpegli Converter

Modern and fast image converter built with **Tauri** and **React**, designed to high-quality JPEG conversion.

## Features

### 🚀 High-Efficiency JPEG Conversion
Uses **cjpegli** (from libjxl project) to generate high-quality JPEGs with superior density and visual fidelity compared to standard encoders.

### ⚡ Parallel Processing
Leverages Rust's multi-threading capabilities (via `rayon`) to process images in parallel, utilizing your CPU's full potential.

### 📸 Metadata Preservation
Keeps your EXIF metadata and file timestamps intact during conversion using **exiftool**.

### 🎨 Modern UI
- **Live Preview**: Inspect images before processing.
- **Dark Mode**: Sleek, modern interface.
- **Custom Titlebar**: Integrated window controls for a seamless look.
- **Drag & Drop**: Easy file management.

### ⚙️ Smart Workflow
- **Duplicate Handling**: Option to skip efficiently.
- **Settings Persistence**: Your configuration is saved automatically.

## Technology Stack

- **Framework**: [Tauri v2](https://v2.tauri.app/) (Rust + Webview)
- **Frontend**: React 19, Vite 6, TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React Hooks & Context
- **Core Libraries**:
  - `cjpegli` (High-quality JPEG encoding)
  - `exiftool` (Metadata handling)
  - `rayon` (Parallelism)

## Development

### Prerequisites

1. **Node.js**: Version 18+
2. **Rust**: Latest stable version (install via [rustup.rs](https://rustup.rs/))
3. **OS Components**:
   - **macOS**: Xcode Command Line Tools
   - **Windows**: C++ Build Tools
   - **Linux**: WebKit2GTK and base build tools
4. **External Binaries**:
   The application uses `cjpegli` and `exiftool` as sidecars. You need to place the binaries for your platform in the `src-tauri/binaries/` directory following Tauri's [sidecar naming convention](https://v2.tauri.app/develop/sidecar/#sidecar-naming-convention):
   - `cjpegli-<target-triple>`
   - `exiftool-<target-triple>`

### Installation

```bash
npm install
```

### Run in Development Mode

```bash
npm run tauri:dev
```
This command starts the Vite dev server and the Tauri window.

### Build for Production

```bash
npm run tauri:build
```
The output will be available in `src-tauri/target/release/bundle/`.

## Project Structure

```
.
├── src/                # Frontend (React) source
│   ├── renderer/       # UI components and logic
│   └── common/         # Shared types
├── src-tauri/          # Backend (Rust) source
│   ├── src/            # Rust source code
│   │   ├── commands/   # Tauri commands
│   │   └── processing/ # Image processing logic
│   ├── binaries/       # External sidecar binaries
│   └── tauri.conf.json # Tauri configuration
└── package.json
```

## License

MIT
