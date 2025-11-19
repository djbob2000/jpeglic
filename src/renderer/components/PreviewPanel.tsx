import { useEffect, useState } from "react";
import type { InputItem, ProcessingProgress } from "../../common/types";
import { formatSize } from "../utils/format";

interface PreviewData {
	data: string;
	metadata: {
		width?: number;
		height?: number;
		format?: string;
		size?: number;
		birthtime?: number;
		exif?: any;
	};
}

interface PreviewPanelProps {
	selectedItem: InputItem | undefined;
	processing?: ProcessingProgress;
}

export const PreviewPanel = ({ selectedItem, processing }: PreviewPanelProps) => {
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);
	const activeItem = processing?.currentItem ?? selectedItem;

	useEffect(() => {
		if (activeItem) {
			const filePath = activeItem.sourcePath;
			window.electron.preview
				.get(filePath)
				.then((data) => {
					setPreviewData(data);
				})
				.catch(() => {
					setPreviewData(null);
				});
		} else {
			setPreviewData(null);
		}
	}, [activeItem]);

	if (!activeItem) {
		return (
			<div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-1 text-center">
				<svg
					aria-hidden="true"
					className="mb-4 h-12 w-12 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M3 16.5v-9a1.5 1.5 0 0 1 1.5-1.5h4.379a1.5 1.5 0 0 1 1.06.44l1.121 1.12a1.5 1.5 0 0 0 1.061.44h6.379A1.5 1.5 0 0 1 20.5 9v7.5A1.5 1.5 0 0 1 19 18H4.5A1.5 1.5 0 0 1 3 16.5Z"
					/>
				</svg>
				<div className="font-medium text-text-secondary">No File Selected</div>
				<p className="mt-2 max-w-[14rem] text-xs text-text-tertiary">
					Select a file to view its details
				</p>
			</div>
		);
	}

	const { metadata } = previewData || {};
	const exif = metadata?.exif;
	
	// Extract useful info from exiftool data
	// exiftool returns a flat structure with many potential date fields
	const dateTaken = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
	const cameraMake = exif?.Make;
	const cameraModel = exif?.Model;
	const camera = [cameraMake, cameraModel].filter(Boolean).join(" ");
	
	// Parse ExifTool date object or string
	let creationDate: Date | null = null;
	if (dateTaken) {
		// ExifTool often returns ExifDateTime objects, but they stringify well or have properties
		// If it's a string, it's usually "YYYY:MM:DD HH:MM:SS"
		const dateStr = dateTaken.toString();
		// Basic attempt to parse standard EXIF date format if standard Date parsing fails
		const exifDateRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
		const match = dateStr.match(exifDateRegex);
		if (match) {
			creationDate = new Date(
				parseInt(match[1]),
				parseInt(match[2]) - 1,
				parseInt(match[3]),
				parseInt(match[4]),
				parseInt(match[5]),
				parseInt(match[6])
			);
		} else {
			creationDate = new Date(dateStr);
		}
		
		if (isNaN(creationDate.getTime())) {
			creationDate = null;
		}
	}
	
	// Fallback to file birthtime if no valid EXIF date
	if (!creationDate && metadata?.birthtime) {
		creationDate = new Date(metadata.birthtime);
	}

	const dimensions = metadata?.width && metadata?.height ? `${metadata.width} × ${metadata.height}` : null;

	return (
		<div className="flex gap-6 rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
			{/* Image Preview */}
			<div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 shadow-inner">
				{previewData?.data ? (
					<img
						src={previewData.data}
						alt={activeItem.displayName}
						className="h-full w-full object-contain"
					/>
				) : (
					<svg
						className="h-16 w-16 text-text-tertiary"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1}
							d="M3 16.5v-9a1.5 1.5 0 0 1 1.5-1.5h4.379a1.5 1.5 0 0 1 1.06.44l1.121 1.12a1.5 1.5 0 0 0 1.061.44h6.379A1.5 1.5 0 0 1 20.5 9v7.5A1.5 1.5 0 0 1 19 18H4.5A1.5 1.5 0 0 1 3 16.5Z"
						/>
					</svg>
				)}
			</div>

			{/* Details */}
			<div className="flex flex-1 flex-col justify-center space-y-4">
				<div>
					<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
						File Name
					</div>
					<div className="text-lg font-semibold text-text-primary truncate" title={activeItem.displayName}>
						{activeItem.displayName}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-x-8 gap-y-4">
					{/* Size & Status */}
					<div>
						<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
							Size
						</div>
						<div className="text-sm font-medium text-text-primary">
							{formatSize(activeItem.sizeBytes)}
						</div>
					</div>
					
					<div>
						<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
							Status
						</div>
						<div className="text-sm font-medium text-primary">
							{processing?.currentItem && processing.currentItem.id === activeItem.id
								? "Processing..."
								: "Ready"}
						</div>
					</div>

					{/* Dimensions */}
					{dimensions && (
						<div>
							<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
								Dimensions
							</div>
							<div className="text-sm font-medium text-text-primary">
								{dimensions}
							</div>
						</div>
					)}

					{/* Date */}
					{creationDate && (
						<div>
							<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
								{dateTaken ? "Date Taken" : "Created"}
							</div>
							<div className="text-sm font-medium text-text-primary">
								{creationDate.toLocaleDateString()} {creationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</div>
						</div>
					)}

					{/* Camera */}
					{camera && (
						<div className="col-span-2">
							<div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
								Camera
							</div>
							<div className="text-sm font-medium text-text-primary truncate" title={camera}>
								{camera}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
