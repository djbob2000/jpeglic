import { type DragEvent, type KeyboardEvent, useCallback, useState, useEffect } from "react";
import type { InputItem, ProcessingProgress } from "../../common/types";
import { formatSize } from "../utils/format";

type FileWithPath = File & { path?: string };

interface InputTabProps {
    items: InputItem[];
    onAddFiles: (paths: string[]) => Promise<void> | void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onStartConversion: () => void;
    hasItems: boolean;
    processing?: ProcessingProgress;
}

export const InputTab = ({
    items,
    onAddFiles,
    onRemove,
    onClear,
    onStartConversion,
    hasItems,
    processing,
}: InputTabProps) => {
	const [isDragOver, setDragOver] = useState(false);
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);

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

	const handleFileSelect = useCallback((itemId: string) => {
		setSelectedItemId(itemId);
	}, []);

    const selectedItem = items.find(item => item.id === selectedItemId);
    const activePreviewItem = (processing?.currentItem ?? selectedItem) ?? null;

    useEffect(() => {
        if (activePreviewItem) {
            const filePath = activePreviewItem.sourcePath;
            window.electron.preview.get(filePath)
                .then((imageData: string) => {
                    setPreviewImage(imageData);
                })
                .catch(() => {
                    setPreviewImage(null);
                });
        } else {
            setPreviewImage(null);
        }
    }, [activePreviewItem]);

	return (
		<div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 p-4">
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
				className={`drop-zone flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-12 text-center transition-all hover:border-accent ${
					isDragOver ? "border-accent bg-accent/10 text-accent" : "text-secondary"
				}`}
			>
				<svg aria-hidden="true" className="h-16 w-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75m-7.5 6.75h12a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-12a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z" />
				</svg>
                <div className="text-xl font-semibold mb-2">
                        Drop files here
                    </div>
					<div className="text-sm text-secondary">
						or click to browse
					</div>
			</button>

			{/* File List and Preview */}
			<div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				{/* File List Panel */}
                <div className="panel h-full">
                    <div className="panel-header-centered">
                        <span className="panel-title">Files ({items.length})</span>
                    </div>
                    {hasItems && (
                        <div className="flex justify-end mb-2">
                            <button type="button" onClick={onClear} className="btn-secondary px-3 py-1 text-xs">
                                Clear All
                            </button>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-8 text-sm text-secondary">
                                No files added yet
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {items.map((item) => (
                                    <li
                                    key={item.id}
                                        className={`file-item flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-accent/5 transition-colors cursor-pointer ${
                                            selectedItemId === item.id ? 'bg-accent/10 border-l-2 border-accent' : ''
                                        }`}
                                        onClick={() => handleFileSelect(item.id)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium text-primary">{item.displayName} — {formatSize(item.sizeBytes)}</div>
                                            {(() => {
                                                const rp = item.relativePath;
                                                const name = item.displayName;
                                                let dir = '';
                                                if (rp && rp.toLowerCase().endsWith(name.toLowerCase())) {
                                                    dir = rp.slice(0, rp.length - name.length).replace(/[\\/]+$/, '');
                                                }
                                                return dir ? (
                                                    <div className="truncate text-xs text-secondary">{dir}</div>
                                                ) : null;
                                            })()}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(item.id)}
                                            className="btn-secondary px-2 py-1 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

				{/* Preview Panel */}
                <div className="panel h-full">
                    <div className="panel-header-centered">
                        <span className="panel-title">Preview</span>
                    </div>
                    <div className="flex h-full flex-col text-secondary">
                        {(() => {
                            const activeItem = processing?.currentItem ?? selectedItem;
                            return activeItem ? (
                            <div className="space-y-4 p-4">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="w-32 h-32 bg-border rounded-lg flex items-center justify-center overflow-hidden">
                                        {previewImage ? (
                                            <img 
                                                src={previewImage} 
                                                alt={activeItem.displayName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <svg className="w-16 h-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 16.5v-9a1.5 1.5 0 0 1 1.5-1.5h4.379a1.5 1.5 0 0 1 1.06.44l1.121 1.12a1.5 1.5 0 0 0 1.061.44h6.379A1.5 1.5 0 0 1 20.5 9v7.5A1.5 1.5 0 0 1 19 18H4.5A1.5 1.5 0 0 1 3 16.5Z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-secondary mb-1">File Name</div>
                                        <div className="text-sm font-medium text-primary">{activeItem.displayName}</div>
                                    </div>
                                    {activeItem.relativePath && activeItem.relativePath !== activeItem.displayName && (
                                        <div>
                                            <div className="text-xs text-secondary mb-1">Path</div>
                                            <div className="text-sm text-secondary">{activeItem.relativePath}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xs text-secondary mb-1">Size</div>
                                        <div className="text-sm text-secondary">{formatSize(activeItem.sizeBytes)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-secondary mb-1">Status</div>
                                        <div className="text-sm text-accent">{processing?.currentItem && processing.currentItem.id === activeItem.id ? 'Processing' : 'Ready for conversion'}</div>
                                    </div>
                                </div>
                            </div>
                            ) : (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <svg
                                    aria-hidden="true"
                                    className="mb-4 h-12 w-12"
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
                                <div className="font-medium text-primary">Preview</div>
                                <p className="mt-2 max-w-[14rem] text-xs text-secondary">
                                    Select a file to view its details
                                </p>
                            </div>
                            );
                        })()}
                    </div>
                </div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={onClear}
					disabled={!hasItems}
					className="btn-secondary rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
				>
					Clear
				</button>
				<button
					type="button"
					onClick={onStartConversion}
					disabled={!hasItems}
					className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
				>
					Convert
				</button>
			</div>
		</div>
	);
};
