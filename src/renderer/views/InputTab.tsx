import { type DragEvent, useState } from "react";
import { cn } from "@utils/cn";
import type { InputItem, ProcessingProgress } from "@common/types";
import { formatSize } from "@utils/format";

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
  onStartConversion: () => void;
  isConverting: boolean;
  onCancel: () => void;
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
  onStartConversion,
  isConverting,
  onCancel,
}: InputTabProps) => {
  const [isDragOver, setDragOver] = useState(false);

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (isConverting) return;
    event.preventDefault();
    setDragOver(false);

    const files = Array.from(event.dataTransfer?.files ?? []);
    const paths = files
      .map((file) => window.electron.utils.getPathForFile(file))
      .filter((filePath): filePath is string => Boolean(filePath));

    await onAddFiles(paths);
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col transition-colors",
        isDragOver && "bg-primary/5",
        isConverting && "opacity-90 pointer-events-none"
      )}
      onDragOver={(event) => {
        if (isConverting) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* File List Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Files ({items.length}) •{" "}
          {formatSize(items.reduce((acc, item) => acc + item.sizeBytes, 0))}
        </span>
        {hasItems && !isConverting && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-text-secondary hover:text-red-500 transition-colors pointer-events-auto"
          >
            Clear All
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-text-tertiary opacity-60">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">Drag & drop files here</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  selectedItemId === item.id
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                )}
                onClick={() => onSelect(item.id)}
              >
                {/* Status Indicator */}
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    processing?.currentItem?.id === item.id
                      ? "bg-primary animate-pulse"
                      : "bg-border group-hover:bg-text-tertiary"
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.displayName}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <span>{formatSize(item.sizeBytes)}</span>
                    {item.isProcessed && (
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500">
                        Optimized
                      </span>
                    )}
                  </div>
                </div>

                {!isConverting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="hidden rounded p-1 text-text-tertiary hover:bg-surface-3 hover:text-red-500 group-hover:block pointer-events-auto"
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
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Start Button */}
      <div className="p-4 bg-surface-2 pointer-events-auto">
        {!isConverting ? (
          <button
            type="button"
            onClick={onStartConversion}
            disabled={!hasItems}
            className="w-full btn-primary py-3 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:transform-none disabled:shadow-none rounded-lg flex items-center justify-center gap-2"
          >
            <span>Start Conversion</span>
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg bg-red-100/10 text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
          >
            <span>Stop Conversion</span>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </button>
        )}
      </div>
    </div>
  );
};
