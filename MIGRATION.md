# Migration from Python to TypeScript/Electron

This document describes the migration of XL Converter from Python/PySide6 to TypeScript/Electron.

> **Note:** The original Python/PySide6 code has been archived and is available in the git history (commit `6fcad3a`) if needed for reference.

## Major Changes

### Technology Stack

**Before (Python):**
- PySide6/Qt for UI
- External CLI tools (cjxl, avifenc, cwebp, jpegli, ImageMagick, ExifTool, oxipng)
- PyInstaller for bundling
- send2trash for file deletion

**After (TypeScript/Electron):**
- Electron for cross-platform desktop
- TypeScript for type safety
- Sharp library for image processing (replaces most CLI tools)
- External CLI only for JPEG XL (cjxl)
- electron-builder for packaging
- trash for file deletion

### Architecture

**Before:**
```
main.py (QApplication)
├── MainWindow (QMainWindow)
├── Controller
├── Worker (QRunnable)
└── QThreadPool
```

**After:**
```
src/main.ts (Electron Main Process)
├── BrowserWindow
├── IPC Handlers
├── Controller
└── Worker

src/renderer/ (Electron Renderer Process)
├── index.html
├── styles.css
└── app.ts (UI logic)
```

### Image Processing

**Before:**
- External binaries called via subprocess
- ImageMagick for all downscaling
- Format-specific encoders (cjxl, avifenc, cwebp, jpegli)

**After:**
- Sharp library for most formats (AVIF, WebP, JPEG, PNG) and downscaling
- Only external: cjxl for JPEG XL
- Metadata extraction/preservation through Sharp

## Feature Parity

### Maintained Features
✅ All input formats supported (JPEG, PNG, WebP, AVIF, JXL, GIF, BMP, TIFF)
✅ All output formats (JPEG, PNG, WebP, AVIF, JXL)
✅ Parallel processing with configurable concurrency
✅ All downscaling modes (dimensions, percentage, longest/shortest side, megapixels)
✅ Quality and effort settings
✅ Lossless encoding options
✅ Metadata preservation
✅ Timestamp preservation
✅ File deletion after conversion
✅ Progress tracking with cancellation
✅ Audio notification on completion
✅ Conflict resolution (overwrite/skip/rename)
✅ Folder structure preservation
✅ Batch processing
✅ Drag-and-drop support

### Simplified/Changed
- UI rebuilt with HTML/CSS (cleaner, more maintainable)
- Sharp handles most image operations internally (faster, more reliable)
- Fewer external dependencies
- Simpler metadata handling via Sharp

### Removed Dependencies
- PyInstaller → electron-builder
- PySide6/Qt → Electron
- ImageMagick (mostly) → Sharp
- avifenc → Sharp's native AVIF support
- cwebp → Sharp's native WebP support
- jpegli → Sharp with MozJPEG
- ExifTool → Sharp's metadata API
- oxipng → Sharp's PNG compression

### Still Required
- cjxl for JPEG XL encoding (Sharp doesn't support JXL output yet)

## Development Workflow

### Before
```bash
python -m venv env_build
source env_build/bin/activate
pip install -r requirements.txt
python main.py
```

### After
```bash
npm install
npm run dev      # Development mode
npm start        # Production mode
npm run package  # Create distributable
```

## Benefits of Migration

1. **Better Developer Experience**
   - TypeScript provides excellent IDE support and type safety
   - Hot reload during development
   - Modern JavaScript ecosystem

2. **Simplified Dependencies**
   - Sharp replaces multiple external tools
   - Fewer binaries to bundle
   - More portable builds

3. **Performance**
   - Sharp is highly optimized (libvips-based)
   - No subprocess overhead for most operations
   - Better memory management

4. **Maintainability**
   - Cleaner separation of concerns (main/renderer)
   - Modern web technologies for UI
   - Easier to extend and customize

5. **Cross-Platform**
   - Consistent behavior across platforms
   - Easier build process
   - Standard Electron packaging

## Migration Steps Taken

1. ✅ Removed Python source files
2. ✅ Created TypeScript project structure
3. ✅ Implemented Electron main process
4. ✅ Created IPC bridge with preload script
5. ✅ Implemented Controller with worker management
6. ✅ Created Worker with Sharp-based processing
7. ✅ Built HTML/CSS UI
8. ✅ Implemented renderer process logic
9. ✅ Added build and packaging scripts
10. ✅ Updated documentation
11. ✅ Integrated Jest for unit testing
12. ✅ Added settings persistence with electron-store
13. ✅ Implemented auto-updates with electron-updater
14. ✅ Created custom titlebar for better UX
15. ✅ Added live preview pane powered by React

## Future Improvements

- Expand React-based components across more of the UI for richer interactions
- Add end-to-end tests (e.g., Playwright) to complement unit tests
- Integrate additional modern formats as Sharp releases support (e.g., HEIF, JPEG XL decoding)
- Provide theme customization and accessibility enhancements
- Extend preview pane with side-by-side before/after comparison and zoom tools
