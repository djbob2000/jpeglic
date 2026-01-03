# Jpeglic • Best jpg converter

Modern and fast image converter built with **Tauri** and **React**, designed to high-quality JPEG conversion.

## Features

### 🚀 High-Efficiency JPEG Conversion
Uses **jpegli** (via Rust bindings) to generate high-quality JPEGs with superior density and visual fidelity compared to standard encoders.

### ⚡ Parallel Processing
Leverages Rust's multi-threading capabilities (via `rayon`) to process images in parallel, utilizing your CPU's full potential.

### 📸 Metadata Preservation
Keeps your EXIF metadata, ICC profiles, and timestamps intact during conversion using efficient Rust libraries.

### 🎨 Modern UI
- **Live Preview**: Inspect images before processing.
- **Dark Mode**: Sleek, modern interface.
- **Custom Titlebar**: Integrated window controls for a seamless look.
- **Drag & Drop**: Easy file management.

### ⚙️ Smart Workflow
- **Duplicate Handling**: Smart auto-renaming (Chrome-style) to prevent overwrites.
- **Settings Persistence**: Your configuration is saved automatically.

## Technology Stack

- **Framework**: [Tauri v2](https://v2.tauri.app/) (Rust + Webview)
- **Frontend**: React 19, Vite 6, TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React Hooks & Context
- **Core Libraries**:
  - `jpegli` (High-quality JPEG encoding)
  - `img-parts` (Metadata handling)
  - `rayon` (Parallelism)

## Development

### Prerequisites

1. **Node.js**: Version 18+
2. **Rust**: Latest stable version (install via [rustup.rs](https://rustup.rs/))
3. **OS Components**:
   - **macOS**: Xcode Command Line Tools
   - **Windows**: C++ Build Tools
   - **Linux**: WebKit2GTK and base build tools


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
│   └── tauri.conf.json # Tauri configuration
└── package.json
```

## License

MIT
