/**
 * Type definitions for the application.
 * 
 * NOTE: These types are auto-generated from Rust using ts-rs crate.
 * The bindings are located in src-tauri/bindings/.
 * 
 * TYPE MAPPING NOTES:
 * - number: Used for all numeric values including sizes and timestamps
 *   - File sizes (sizeBytes, savedBytes) are within Number.MAX_SAFE_INTEGER (9PB)
 *   - Timestamps (lastModified, birthtime, mtime) fit within standard number
 *   - Dimensions (width, height) are standard numbers
 *
 * When converting from Rust u64/i64, they are serialized as JSON numbers.
 * We use 'number' in TS to match this behavior and avoid runtime errors.
 */

export type OutputFormat = "jpeg";

export interface ProcessedStatus {
	path: string;
	isProcessed: boolean;
}

/**
 * File statistics from the filesystem.
 * Uses bigint for size and mtime to handle large files and precise timestamps.
 */
export interface FileStats {
	isFile: boolean;
	isDirectory: boolean;
	/** File size in bytes (number safe up to 9PB) */
	size: number;
	/** Modification time as Unix timestamp in milliseconds */
	mtime: number;
}

export interface DirEntry {
	name: string;
	isFile: boolean;
	isDirectory: boolean;
}

export interface AdvancedSettings {
	concurrency: number;
	preserveMetadata: boolean;
	preserveTimestamps: boolean;
	deleteOriginals: boolean;
	skipProcessed: boolean;
	playSoundOnFinish: boolean;
	soundVolume: number;
	clearInputAfterConversion: boolean;
	warnBeforeReplace: boolean;
	recompressOptimized: boolean; // converted from recompress_optimized
	sizeCompare: boolean; // converted from size_compare
}

export interface OutputSettings {
	format: OutputFormat;
	keepAlpha: boolean;
	destination: "source" | "custom";
	customDirectory?: string;
	keepFolderStructure: boolean;
	visuallyLossless: boolean;
	cjpegliDistance: number;
	forceSubsampling444: boolean;
	useXyb: boolean;
	progressive: boolean;
	stripMetadata: boolean;
}

export interface WindowSettings {
	width: number;
	height: number;
	x?: number;
	y?: number;
	maximized: boolean;
}

export interface AppState {
	settings: ProcessingSettings;
	window: WindowSettings;
}

export interface ProcessingSettings {
	output: OutputSettings;
	advanced: AdvancedSettings;
}

/**
 * Represents an input file item for processing.
 * sizeBytes and lastModified use bigint to match Rust's u64/i64 types.
 */
export interface InputItem {
	id: string;
	sourcePath: string;
	displayName: string;
	relativePath: string;
	/** File size in bytes */
	sizeBytes: number;
	/** Last modification time as Unix timestamp in milliseconds */
	lastModified: number;
	isProcessed?: boolean;
}

export interface ProcessingRequest {
	items: InputItem[];
	settings: ProcessingSettings;
}

/**
 * Progress update during batch processing.
 * savedBytes uses bigint to accumulate potentially large total savings.
 */
export interface ProcessingProgress {
	completed: number;
	total: number;
	currentItem?: InputItem;
	currentOutputPath?: string;
	message?: string;
	/** ID of item that was just processed (success or skipped) */
	processedItemId?: string;
	/** Total bytes saved so far */
	savedBytes?: number;
	activeItemIds?: string[];
}

/**
 * Final result of a batch processing operation.
 * savedBytes uses bigint to report total space savings accurately.
 */
export interface ProcessingResult {
	successCount: number;
	skippedCount: number;
	failedCount: number;
	errors: Array<{ item: InputItem; error: string }>;
	canceled: boolean;
	/** Total bytes saved across all processed files */
	savedBytes: number;
}

/**
 * Metadata extracted from an image for preview purposes.
 * - width/height: number (u32 in Rust, always within safe integer range)
 * - size: bigint (u64 in Rust, file size can be very large)
 * - birthtime: bigint (i64 in Rust, Unix timestamp)
 */
export interface PreviewMetadata {
	/** Image width in pixels (number as u32 is within safe range) */
	width: number | null;
	/** Image height in pixels (number as u32 is within safe range) */
	height: number | null;
	/** Image format (e.g., "JPEG", "PNG") */
	format: string | null;
	/** File size in bytes */
	size: number | null;
	/** File creation time as Unix timestamp in milliseconds */
	birthtime: number | null;
	/** EXIF metadata as key-value pairs */
	exif: Record<string, unknown> | null;
}

export interface PreviewData {
	url: string;
	metadata: PreviewMetadata;
}

export interface AppSettings {
	output: OutputSettings;
	advanced: AdvancedSettings;
	window: WindowSettings;
}
