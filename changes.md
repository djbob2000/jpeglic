# Changelog: Jpeglic Modernization & Hardening

This document details the comprehensive refactoring, security hardening, and architectural improvements applied to the Jpeglic application.

## 🛡️ 1. Security & Stability (Rust Backend)

### Hardened Content Security Policy (CSP)
- **File**: `src-tauri/tauri.conf.json`
- **Change**: Removed `unsafe-eval` from the CSP to mitigate XSS risks.
- **Change**: Restricted `assetProtocol` scope.
  - **Before**: `["$HOME/**", ..., "/**"]` (Allowed access to entire filesystem)
  - **After**: Restricted to specific user directories (`$HOME`, `$DOCUMENT`, `$PICTURE`, `$DESKTOP`, `$DOWNLOAD`).

### Optimized Memory Usage (OOM Prevention)
- **File**: `src-tauri/src/processing/worker.rs`
- **Change**: Refactored `detect_subsampling` function.
  - **Before**: Read the **entire file** into memory (`fs::read`) just to check JPEG headers. This caused Out-Of-Memory crashes when processing large batches of RAW/TIFF files.
  - **After**: Implemented `BufReader` to stream only the first few kilobytes required to parse the SOF (Start of Frame) markers.

### Panic Prevention
- **File**: `src-tauri/src/processing/worker.rs`
- **Change**: Removed dangerous `unwrap()` calls on file paths.
  - Replaced `path.parent().unwrap()` with safe `ok_or_else` error handling. This prevents the worker thread from crashing if it encounters a file at the root directory.

## 🏗️ 2. React Architecture (Frontend)

### Introduced Context API
- **File**: `src/renderer/contexts/SettingsContext.tsx` (New)
- **Change**: Created a global `SettingsContext` to manage application state (`output` and `advanced` settings).
- **Impact**: Eliminated prop-drilling. Components like `SettingsTab` and `PreviewPanel` now consume settings directly from the hook rather than having them passed down 4 levels from `App.tsx`.

### Decoupled Components
- **File**: `src/renderer/hooks/useImageMetadata.ts` (New)
- **Change**: Extracted complex EXIF parsing, date formatting, and metadata display logic (~80 lines) from `PreviewPanel.tsx`.
- **File**: `src/renderer/components/PreviewPanel.tsx`
- **Change**: Refactored to be a pure presentational component. It now uses the `useImageMetadata` hook for data transformation.

### Simplified Main Application
- **File**: `src/renderer/App.tsx`
- **Change**: Removed bulk props passing. Wrapped the application with `SettingsProvider`.
- **File**: `src/renderer/main.tsx`
- **Change**: Added `Toaster` (Sonner) and `SettingsProvider` at the root level.

## 💎 3. User Experience (UX)

### Modern Notification System
- **Library**: Added `sonner`
- **File**: `src/renderer/hooks/useConversion.ts`
- **Change**: Replaced all instances of blocking `window.alert()` with non-blocking, beautiful toast notifications (`toast.error`, `toast.warning`). Errors now appear gracefully without freezing the UI.

### Settings Interface
- **File**: `src/renderer/views/SettingsTab.tsx`
- **Change**: Refactored to use `useSettings` hook. Fixed syntax errors and improved code structure.

## 📐 4. Type Safety & Code Quality

### Strict Type Synchronization
- **File**: `src/common/types.ts`
- **Change**: Updated TypeScript definitions to match Rust's `ts-rs` output.
  - Switched `size`, `mtime`, `savedBytes` from `number` to `bigint`. This ensures correct handling of large integers (files sizes > 9PB) and timestamps, preventing potential runtime overflow errors.

### Utility Updates
- **File**: `src/renderer/utils/format.ts`
- **Change**: Updated `formatSize` to explicitly handle `bigint` inputs.
- **File**: `src/renderer/utils/tauriAPI.ts`
- **Change**: Replaced unsafe `@ts-ignore` with `@ts-expect-error` to strictly document where Tauri's non-standard API extends the browser `File` object.

### Code Style
- **Tooling**: Applied `biome` formatting across the entire codebase for consistent indentation and style.
