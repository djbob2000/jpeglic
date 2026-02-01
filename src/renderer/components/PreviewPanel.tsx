import type { InputItem, ProcessingProgress, ProcessingSettings } from "@common/types";
import { cn } from "@utils/cn";
import { formatSize } from "@utils/format";
import tauriAPI from "@utils/tauriAPI";
import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ProcessingStatus } from "./ProcessingStatus";

interface PreviewData {
	url: string;
	metadata: {
		width: number | null;
		height: number | null;
		format: string | null;
		size: bigint | null;
		birthtime: bigint | null;
		exif: Record<string, unknown> | null;
	};
}

interface PreviewPanelProps {
	selectedItem: InputItem | undefined;
	processing?: ProcessingProgress;
	onAddFiles: (paths: string[]) => Promise<void> | void;
	onOpenSettings: () => void;
	settings: ProcessingSettings;
	isConverting: boolean;
	percentage: number;
	lastProcessedPath?: string | null;
}

const formatExifDate = (date: Date) => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(
		date.getHours(),
	)}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const PreviewPanel = ({
	selectedItem,
	processing,
	onAddFiles,
	onOpenSettings,
	settings,
	isConverting,
	percentage,
	lastProcessedPath,
}: PreviewPanelProps) => {
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);
	const [previousData, setPreviousData] = useState<PreviewData | null>(null);
	const [isDragOver, setDragOver] = useState(false);
	const [isImageLoaded, setIsImageLoaded] = useState(false);

	const [isDataLoading, setIsDataLoading] = useState(false);
	const activeItem = selectedItem;
	const displayItem = activeItem || (isConverting ? processing?.currentItem : undefined);

	// Keep track of current data for transition logic
	const currentDataRef = useRef<{ data: PreviewData | null; loaded: boolean }>({
		data: null,
		loaded: false,
	});

	useEffect(() => {
		currentDataRef.current = { data: previewData, loaded: isImageLoaded };
	}, [previewData, isImageLoaded]);

	// Generate settings display text
	const getSettingsText = () => {
		if (settings.output.destination === "source") {
			return "Replace originals";
		}
		if (settings.output.destination === "custom") {
			if (settings.output.customDirectory) {
				return `Save to ${settings.output.customDirectory}`;
			}
			// Fallback - shouldn't normally happen due to auto-picker
			return "Choose directory...";
		}
		return "Replace originals";
	};

	const handleDrop = async (event: DragEvent<HTMLDivElement | HTMLButtonElement>) => {
		event.preventDefault();
		setDragOver(false);
		// Note: Actual file handling is done by Tauri's global onFileDrop listener
		// This handler just prevents default browser behavior and manages drag state
	};

	const handleBrowse = async () => {
		const paths = await tauriAPI.dialog.openFiles();
		await onAddFiles(paths);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			void handleBrowse();
		}
	};

	useEffect(() => {
		let ignore = false;

		// The path we want to load metadata and preview for
		const pathToShow = (isConverting ? lastProcessedPath : selectedItem?.sourcePath) || null;

		if (pathToShow) {
			// Transition logic: Keep the old image visible until the new one is ready IF we are converting
			const { data: currentData, loaded: currentLoaded } = currentDataRef.current;
			if (isConverting) {
				if (currentData && currentLoaded) {
					setPreviousData(currentData);
				}
			} else {
				setPreviousData(null);
			}

			setIsImageLoaded(false);
			setIsDataLoading(true);

			tauriAPI.preview
				.get(pathToShow)
				.then((data) => {
					if (!ignore) {
						setPreviewData(data);
						setIsDataLoading(false);
					}
				})
				.catch(() => {
					if (!ignore) {
						setPreviewData(null);
						setIsDataLoading(false);
					}
				});
		} else {
			setPreviewData(null);
			setPreviousData(null);
			setIsDataLoading(false);
		}

		return () => {
			ignore = true;
		};
	}, [selectedItem, isConverting, lastProcessedPath]);

	if (!activeItem && !isConverting) {
		return (
			<div className="relative h-full w-full p-4 flex items-center justify-center">
				<button
					type="button"
					onClick={() => {
						void handleBrowse();
					}}
					onKeyDown={handleKeyDown}
					onDragOver={(event) => {
						event.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={handleDrop}
					className={cn(
						"group relative flex h-80 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all hover:border-primary/50 hover:bg-surface-3 hover:shadow-lg hover:shadow-primary/5",
						isDragOver
							? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
							: "border-border bg-surface-2 shadow-md",
					)}
				>
					<div className="rounded-full bg-surface-2 p-4 shadow-sm group-hover:scale-110 transition-transform">
						<svg
							aria-hidden="true"
							className="h-8 w-8 text-primary"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Upload</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75m-7.5 6.75h12a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-12a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"
							/>
						</svg>
					</div>
					<div className="text-center">
						<div className="text-base font-medium text-text-primary">Drop files here</div>
						<div className="text-sm text-text-tertiary">or click to browse</div>
					</div>
				</button>

				{/* Settings Button */}
				<div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
					<span className="text-xs text-text-tertiary font-medium px-2">{getSettingsText()}</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onOpenSettings();
						}}
						className="p-3 rounded-full bg-surface-2 text-text-secondary hover:text-primary hover:bg-surface-3 shadow-lg transition-all"
						title="Open Configuration"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<title>Settings</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</button>
				</div>
			</div>
		);
	}

	// Determine which metadata to show (prevent text flickering during transition)
	const activePreviewData = isImageLoaded ? previewData : previousData || previewData;
	const { metadata } = activePreviewData || {};
	const exif = metadata?.exif;

	// Extract useful info from exiftool data
	// exiftool returns a flat structure with many potential date fields
	const dateTaken = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
	const cameraMake = exif?.Make;
	const cameraModel = exif?.Model;
	const camera = [cameraMake, cameraModel]
		.filter((v): v is string | number => v !== null && v !== undefined && v !== "")
		.map(String)
		.join(" ");

	// Parse ExifTool date object or string
	let creationDate: Date | null = null;
	if (dateTaken) {
		// ExifTool often returns ExifDateTime objects, but they stringify well or have properties
		// If it's a string, it's usually "YYYY:MM:DD HH:MM:SS"
		const dateStr = String(dateTaken);
		// Basic attempt to parse standard EXIF date format if standard Date parsing fails
		const exifDateRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
		const match = dateStr.match(exifDateRegex);
		if (match) {
			creationDate = new Date(
				parseInt(match[1], 10),
				parseInt(match[2], 10) - 1,
				parseInt(match[3], 10),
				parseInt(match[4], 10),
				parseInt(match[5], 10),
				parseInt(match[6], 10),
			);
		} else {
			creationDate = new Date(dateStr);
		}

		if (Number.isNaN(creationDate.getTime())) {
			creationDate = null;
		}
	}

	// Fallback to file birthtime if no valid EXIF date
	if (!creationDate && metadata?.birthtime) {
		creationDate = new Date(Number(metadata.birthtime));
	}

	const dimensions =
		metadata?.width && metadata?.height ? `${metadata.width} × ${metadata.height}` : null;

	// Format helpers for EXIF
	const formatShutter = (val: unknown): string => {
		if (!val) return "";
		const s = String(val)
			.replace(/\s*ev$/i, "")
			.trim();
		if (s.includes("/")) return s.endsWith("s") ? s : `${s}s`;

		const num = parseFloat(s);
		if (Number.isNaN(num) || num <= 0) return s;

		if (num >= 0.4) {
			return `${Number(num.toFixed(1))}s`;
		}
		const denominator = Math.round(1 / num);
		return `1/${denominator}s`;
	};

	const formatAperture = (val: unknown): string => {
		if (!val) return "";
		const s = String(val)
			.replace(/\s*ev$/i, "")
			.trim();
		const num = parseFloat(s);
		if (Number.isNaN(num)) return s;
		return Number(num.toFixed(1)).toString();
	};

	const aperture = exif?.FNumber ? formatAperture(exif.FNumber) : null;
	const shutterSpeed = exif?.ExposureTime ? formatShutter(exif.ExposureTime) : null;
	const iso = exif?.ISO ? String(exif.ISO) : null;
	const lensRaw = exif?.LensModel || exif?.Lens;
	const lens = lensRaw ? String(lensRaw) : null;
	const focalLength = exif?.FocalLength ? String(exif.FocalLength) : null;
	const colorSpace = exif?.ColorSpace ? String(exif.ColorSpace) : null;
	const dateTimeOriginal = exif?.DateTimeOriginal ? String(exif.DateTimeOriginal) : null;

	return (
		<section
			className={cn(
				"flex h-full w-full flex-col overflow-hidden bg-surface-1 transition-colors",
				isDragOver && "bg-primary/5",
			)}
			onDragOver={(event) => {
				event.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={handleDrop}
			aria-label="Image preview area"
		>
			{/* ... Settings Button ... (unchanged) */}
			<div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
				<span className="text-xs text-text-tertiary font-medium px-2 bg-surface-1/80 backdrop-blur-sm rounded">
					{getSettingsText()}
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onOpenSettings();
					}}
					className="p-3 rounded-full bg-surface-2 text-text-secondary hover:text-primary hover:bg-surface-3 shadow-lg transition-all"
					title="Open Configuration"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<title>Settings</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</button>
			</div>

			{/* Image Preview */}
			<div className="flex-1 overflow-hidden bg-surface-2 relative flex items-center justify-center">
				{/* Loading Indicator - Subtle/Non-blocking */}
				{isDataLoading && (
					<div className="absolute top-4 left-4 z-20 animate-in fade-in duration-200">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-sm opacity-70" />
					</div>
				)}

				{isConverting && processing && (
					<ProcessingStatus progress={processing} percentage={percentage} />
				)}

				{/* Previous Image (Background during transition) */}
				{previousData?.url && (
					<img
						src={tauriAPI.convertFileSrc(previousData.url)}
						alt=""
						className="absolute inset-0 h-full w-full object-contain"
						aria-hidden="true"
					/>
				)}

				{/* Current Image (Foreground) */}
				{activePreviewData?.url ? (
					<img
						src={
							activePreviewData.url.startsWith("data:")
								? activePreviewData.url
								: isConverting
									? `${tauriAPI.convertFileSrc(activePreviewData.url)}?t=${Date.now()}`
									: tauriAPI.convertFileSrc(activePreviewData.url)
						}
						alt={displayItem?.displayName || ""}
						className={cn(
							"absolute inset-0 h-full w-full object-contain transition-opacity ease-in-out",
							isConverting ? "duration-200" : "duration-0",
							"opacity-100",
						)}
						onLoad={() => setIsImageLoaded(true)}
						onTransitionEnd={() => {
							if (isImageLoaded) {
								setPreviousData(null);
							}
						}}
					/>
				) : (
					!previousData && (
						<div className="flex h-full w-full items-center justify-center text-text-tertiary">
							<svg
								className="h-24 w-24 opacity-20"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>No Image</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1}
									d="M3 16.5v-9a1.5 1.5 0 0 1 1.5-1.5h4.379a1.5 1.5 0 0 1 1.06.44l1.121 1.12a1.5 1.5 0 0 0 1.061.44h6.379A1.5 1.5 0 0 1 20.5 9v7.5A1.5 1.5 0 0 1 19 18H4.5A1.5 1.5 0 0 1 3 16.5Z"
								/>
							</svg>
						</div>
					)
				)}
			</div>

			{/* Details Bar */}
			<div className="border-t border-border bg-surface-1 p-4">
				<div className="flex flex-col items-center justify-center gap-4 text-center">
					<div>
						<div
							className="text-lg font-semibold text-text-primary"
							title={displayItem?.displayName}
						>
							{isConverting
								? activePreviewData?.url
									? activePreviewData.url.split(/[\\/]/).pop()
									: "Converting..."
								: displayItem?.displayName || ""}
						</div>
						{(displayItem || metadata) && (
							<div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
								<span>{formatSize(metadata?.size || displayItem?.sizeBytes || 0)}</span>
								{dimensions && (
									<>
										<span className="text-text-tertiary">•</span>
										<span>{dimensions}</span>
									</>
								)}
								{metadata?.format && (
									<>
										<span className="text-text-tertiary">•</span>
										<span>{metadata.format}</span>
									</>
								)}
								{creationDate ? (
									<>
										<span className="text-text-tertiary">•</span>
										<span>{formatExifDate(creationDate)}</span>
									</>
							) : displayItem && displayItem.lastModified > 0 ? (
								<>
									<span className="text-text-tertiary">•</span>
									<span>{formatExifDate(new Date(Number(displayItem.lastModified)))}</span>
								</>
							) : null}
							</div>
						)}
					</div>

					<div className="w-full max-w-2xl min-h-14 flex items-center justify-center">
						<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-secondary border-t border-border/50 pt-3 w-full animate-in fade-in duration-300">
							<div className="flex items-center gap-1.5" title="Camera">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Camera</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span>{camera || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Lens">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Lens</title>
									<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
									<circle cx="12" cy="12" r="5" strokeWidth={1.5} />
									<circle cx="12" cy="12" r="2" strokeWidth={1.5} />
								</svg>
								<span>{lens || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Date Taken">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Date Taken</title>
									<rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeWidth={1.5} />
									<line x1="16" x2="16" y1="2" y2="6" strokeWidth={1.5} />
									<line x1="8" x2="8" y1="2" y2="6" strokeWidth={1.5} />
									<line x1="3" x2="21" y1="10" y2="10" strokeWidth={1.5} />
								</svg>
								<span>{dateTimeOriginal || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Aperture">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Aperture</title>
									<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"
									/>
								</svg>
								<span>{aperture ? `f/${aperture}` : ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Shutter Speed">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Shutter Speed</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>{shutterSpeed || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="ISO">
								<span className="font-medium text-text-tertiary">ISO</span>
								<span>{iso || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Focal Length">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Focal Length</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M8 7l-5 5 5 5M16 7l5 5-5 5M3 12h18"
									/>
								</svg>
								<span>{focalLength || ""}</span>
							</div>

							<div className="flex items-center gap-1.5" title="Color Space">
								<svg
									className="w-4 h-4 text-text-tertiary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Color Space</title>
									<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
									/>
								</svg>
								<span>{colorSpace || ""}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};
