# Jpeglic • Best jpg converter

**Minimalism and uncompromising quality.**

Inspired by the philosophy of JpegMini, Jpeglic is built for those who value both simplicity and excellence. We combine a clean, distraction-free interface with the most advanced processing technology available today. Your photos deserve to look their best, and we make sure they do—fast.

## What makes Jpeglic special?

### 🚀 State-of-the-Art Core
We utilize the very latest breakthroughs in image encoding research (advanced psychovisual modeling) to deliver stunning visual quality with impressive file size reduction. It's the best of modern technology, working silently for you.

### ⚡ Blazing Fast performance
Your time is valuable. Jpeglic is engineered to harness the full power of your computer, processing your photo library with incredible speed.

### 📸 Memories, Preserved
We understand that metadata matters. Your EXIF data, ICC profiles, and timestamps are carefully preserved, so your digital archive remains complete and accurate.

### 🎨 Designed for You
- **Live Preview**: See the difference instantly.
- **Modern Experience**: A sleek, dark interface that focuses on your content.
- **Drag & Drop**: Simplicity at its core—just drag your files and let us handle the rest.

### ⚙️ Smart & Safe
- **Worry-Free Handling**: Intelligent file management prevents accidental overwrites of your precious originals.
- **Ready When You Are**: Your preferences are saved automatically, making your workflow seamless.

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

## License

MIT
