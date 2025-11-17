import { type DragEvent, type KeyboardEvent, useCallback, useState } from "react";
import type { InputItem } from "../../common/types";
import { formatSize } from "../utils/format";

type FileWithPath = File & { path?: string };

interface InputTabProps {
	items: InputItem[];
	onAddFiles: (paths: string[]) => Promise<void> | void;
	onRemove: (id: string) => void;
	onClear: () => void;
	onStartConversion: () => void;
	hasItems: boolean;
}

export const InputTab = ({
	items,
	onAddFiles,
	onRemove,
	onClear,
	onStartConversion,
	hasItems,
}: InputTabProps) => {
	const [isDragOver, setDragOver] = useState(false);

	const handleDrop = useCallback(
		async (event: DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setDragOver(false);

			const files = Array.from(event.dataTransfer?.files ?? []);
			const paths = files
				.map((file) => (file as FileWithPath).path)
				.filter((filePath): filePath is string => Boolean(filePath));

			await onAddFiles(paths);
		},
		[onAddFiles],
	);

	const handleBrowse = useCallback(async () => {
		const paths = await window.electron.dialog.openFiles();
		await onAddFiles(paths);
	}, [onAddFiles]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				void handleBrowse();
			}
		},
		[handleBrowse],
	);

	return (
		<div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-4 py-6">
			{/* biome-ignore lint/a11y/useSemanticElements -- div provides flexible drag-and-drop surface while retaining keyboard support */}
			<div
				role="button"
				tabIndex={0}
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
				className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center transition-all ${
					isDragOver ? "border-blue-500 bg-blue-50 text-blue-600" : "text-slate-500"
				}`}
			>
				<svg aria-hidden="true" className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
				</svg>
				<div className="text-lg font-medium text-slate-700">
					Drop files here or press Enter to browse
				</div>
				<button
					type="button"
					onClick={handleBrowse}
					className="button-primary rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				>
					Add Files
				</button>
			</div>

			<div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm">
					<div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700">
						Files ({items.length})
					</div>
					<div className="flex-1 overflow-y-auto">
						{items.length === 0 ? (
							<div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
								No files added yet
							</div>
						) : (
							<ul className="divide-y divide-slate-200">
								{items.map((item) => (
									<li
										key={item.id}
										className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
									>
										<div className="min-w-0">
											<div className="truncate font-medium text-slate-700">{item.displayName}</div>
											<div className="truncate text-xs text-slate-400">
												{item.relativePath} — {formatSize(item.sizeBytes)}
											</div>
										</div>
										<button
											type="button"
											onClick={() => onRemove(item.id)}
											className="button-secondary rounded-md px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
										>
											Remove
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				<div className="hidden rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400 lg:flex lg:flex-col lg:items-center lg:justify-center">
					<svg
						aria-hidden="true"
						className="mb-4 h-12 w-12 text-slate-300"
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
					<div className="font-medium text-slate-500">Preview</div>
					<p className="mt-2 max-w-[14rem] text-xs text-slate-400">
						Select a file to view its details here in a future update.
					</p>
				</div>
			</div>

			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={onClear}
					disabled={!hasItems}
					className="button-secondary rounded-lg bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
				>
					Clear
				</button>
				<button
					type="button"
					onClick={onStartConversion}
					disabled={!hasItems}
					className="button-primary rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-300"
				>
					Convert
				</button>
			</div>
		</div>
	);
};
