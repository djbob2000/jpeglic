import { type DragEvent, type KeyboardEvent, useState } from "react";
import type { InputItem, ProcessingProgress } from "../../common/types";
import { formatSize } from "../utils/format";

type FileWithPath = File & { path?: string };

interface InputTabProps {
	items: InputItem[];
	onAddFiles: (paths: string[]) => Promise<void> | void;
	onRemove: (id: string) => void;
	onClear: () => void;
	hasItems: boolean;
	processing?: ProcessingProgress;
	selectedItemId: string | null;
	onSelect: (id: string) => void;
}

export const InputTab = ({
	items,
	onAddFiles,
	onRemove,
	onClear,
	hasItems,
	processing,
	selectedItemId,
	onSelect,
}: InputTabProps) => {
	const [isDragOver, setDragOver] = useState(false);

	const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		setDragOver(false);

		const files = Array.from(event.dataTransfer?.files ?? []);
		const paths = files
			.map((file) => (file as FileWithPath).path)
			.filter((filePath): filePath is string => Boolean(filePath));

		await onAddFiles(paths);
	};

	const handleBrowse = async () => {
		const paths = await window.electron.dialog.openFiles();
		await onAddFiles(paths);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			void handleBrowse();
		}
	};

	return (
		<div className="flex h-full w-full flex-col gap-4 p-4">
			{/* Drop Zone */}
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
				className={`group relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all hover:border-primary/50 hover:bg-primary/5 ${
					isDragOver
						? "border-primary bg-primary/10"
						: "border-border bg-surface-2"
				}`}
			>
				<div className="rounded-full bg-surface-1 p-3 shadow-sm group-hover:scale-110 transition-transform">
					<svg
						aria-hidden="true"
						className="h-6 w-6 text-primary"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75m-7.5 6.75h12a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-12a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"
						/>
					</svg>
				</div>
				<div className="text-center">
					<div className="text-sm font-medium text-text-primary">
						Drop files here
					</div>
					<div className="text-xs text-text-tertiary">
						or click to browse
					</div>
				</div>
			</button>

			{/* File List Header */}
			<div className="flex items-center justify-between px-1">
				<span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
					Files ({items.length})
				</span>
				{hasItems && (
					<button
						type="button"
						onClick={onClear}
						className="text-xs font-medium text-text-secondary hover:text-red-500 transition-colors"
					>
						Clear All
					</button>
				)}
			</div>

			{/* File List */}
			<div className="flex-1 overflow-y-auto -mx-2 px-2">
				{items.length === 0 ? (
					<div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/50 bg-surface-1/50 p-4 text-center text-xs text-text-tertiary">
						No files added yet
					</div>
				) : (
					<ul className="space-y-1">
						{items.map((item) => (
							<li
								key={item.id}
								className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all ${
									selectedItemId === item.id
										? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
										: "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
								}`}
								onClick={() => onSelect(item.id)}
							>
								{/* Status Indicator */}
								<div
									className={`h-2 w-2 rounded-full ${
										processing?.currentItem?.id === item.id
											? "bg-primary animate-pulse"
											: "bg-border group-hover:bg-text-tertiary"
									}`}
								/>

								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{item.displayName}
									</div>
									<div className="flex items-center gap-2 text-xs opacity-70">
										<span>{formatSize(item.sizeBytes)}</span>
									</div>
								</div>

								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onRemove(item.id);
									}}
									className="hidden rounded p-1 text-text-tertiary hover:bg-surface-3 hover:text-red-500 group-hover:block"
									title="Remove file"
								>
									<svg
										className="h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};
