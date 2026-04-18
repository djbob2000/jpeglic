import type { InputItem, ProcessingProgress } from "@common/types";
import { formatExifDate, useImageMetadata } from "@hooks/useImageMetadata";
import { cn } from "@utils/cn";
import { formatSize } from "@utils/format";
import tauriAPI from "@utils/tauriAPI";
import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
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
  isConverting: boolean;
  percentage: number;
  lastProcessedPath?: string | null;
}

export const PreviewPanel = ({
  selectedItem,
  processing,
  onAddFiles,
  onOpenSettings,
  isConverting,
  percentage,
  lastProcessedPath,
}: PreviewPanelProps) => {
  const { settings } = useSettings();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isDragOver, setDragOver] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  // Double-buffer: background URL holds the previous image during crossfade
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(false);

  // Track the current preview URL in a ref (avoids stale closures in interval callback)
  const currentUrlRef = useRef<string | null>(null);
  // Track the latest completed output path without causing re-renders
  const lastProcessedPathRef = useRef<string | null>(null);
  // Track the current item being processed (for showing first file at start)
  const currentItemPathRef = useRef<string | null>(null);
  // Snapshot of preview shown before conversion started (fallback while first preview loads)
  const preConversionPreviewRef = useRef<PreviewData | null>(null);

  const activeItem = selectedItem;
  const displayItem = activeItem || (isConverting ? processing?.currentItem : undefined);

  // Generate settings display text
  const getSettingsText = () => {
    if (!settings) return "";
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

  // Keep refs in sync with props (doesn't cause re-renders)
  useEffect(() => {
    lastProcessedPathRef.current = lastProcessedPath ?? null;
  }, [lastProcessedPath]);

  useEffect(() => {
    currentItemPathRef.current = processing?.currentItem?.sourcePath ?? null;
  }, [processing?.currentItem?.sourcePath]);

  // Capture current preview when conversion starts as fallback
  const wasConvertingRef = useRef(false);
  useEffect(() => {
    if (isConverting && !wasConvertingRef.current) {
      preConversionPreviewRef.current = previewData;
    }
    if (!isConverting && wasConvertingRef.current) {
      preConversionPreviewRef.current = null;
      // Clear background layer when conversion ends
      setBackgroundUrl(null);
    }
    wasConvertingRef.current = isConverting;
  }, [isConverting, previewData]);

  // "Kaleidoscope" — sample completed previews at 3fps (333ms) during conversion
  useEffect(() => {
    if (!isConverting || selectedItem) return;

    let ignore = false;
    let lastLoadedPath: string | null = null;

    const tick = () => {
      // Prefer completed output path; fall back to current input file (for the very start)
      const path = lastProcessedPathRef.current || currentItemPathRef.current;
      if (!path || path === lastLoadedPath || ignore) return;
      lastLoadedPath = path;

      tauriAPI.preview
        .get(path)
        .then((data) => {
          if (!ignore) {
            // Double-buffer: current image becomes background before swapping
            setBackgroundUrl(currentUrlRef.current);
            setPreviewData(data);
            currentUrlRef.current = data.url;
            setIsImageLoaded(false);
          }
        })
        .catch(() => {
          // Silently skip failed previews — next tick will try the next file
        });
    };

    // Fire immediately for the first completed file
    tick();
    const intervalId = setInterval(tick, 333);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [isConverting, selectedItem]);

  // Load preview when NOT converting (normal click-to-select behavior)
  useEffect(() => {
    if (isConverting) return;
    let ignore = false;

    const pathToShow = selectedItem?.sourcePath || null;

    if (pathToShow) {
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
      setIsDataLoading(false);
    }

    return () => {
      ignore = true;
    };
  }, [selectedItem?.sourcePath, isConverting]);

  // Active preview: live data, or pre-conversion snapshot as fallback
  const activePreviewData = previewData || (isConverting ? preConversionPreviewRef.current : null);

  // Use the custom hook for metadata parsing
  const meta = useImageMetadata(previewData, null, isImageLoaded);

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

        {/* Double-buffered image display — 3fps kaleidoscope during conversion */}

        {/* Background layer: previous image, always fully visible — prevents flash */}
        {isConverting && backgroundUrl && (
          <img
            src={
              backgroundUrl.startsWith("data:")
                ? backgroundUrl
                : tauriAPI.convertFileSrc(backgroundUrl)
            }
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            aria-hidden="true"
          />
        )}

        {/* Foreground layer: current image, fades in over the background */}
        {activePreviewData?.url ? (
          <img
            key={activePreviewData.url}
            src={
              activePreviewData.url.startsWith("data:")
                ? activePreviewData.url
                : tauriAPI.convertFileSrc(activePreviewData.url)
            }
            alt={displayItem?.displayName || ""}
            className="absolute inset-0 h-full w-full object-contain"
            style={
              isConverting
                ? { animation: "fadeIn 150ms ease-out" }
                : undefined
            }
            onLoad={() => setIsImageLoaded(true)}
          />
        ) : (
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
                  : processing?.currentItem?.displayName || "Converting..."
                : displayItem?.displayName || ""}
            </div>
            {(displayItem || meta) && (
              <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
                <span>{formatSize(meta?.size || displayItem?.sizeBytes || 0)}</span>
                {meta?.dimensions && (
                  <>
                    <span className="text-text-tertiary">•</span>
                    <span>{meta.dimensions}</span>
                  </>
                )}
                {meta?.format && (
                  <>
                    <span className="text-text-tertiary">•</span>
                    <span>{meta.format}</span>
                  </>
                )}
                {meta?.creationDate ? (
                  <>
                    <span className="text-text-tertiary">•</span>
                    <span>{formatExifDate(meta.creationDate)}</span>
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
                <span>{meta?.camera || ""}</span>
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
                <span>{meta?.lens || ""}</span>
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
                <span>{meta?.dateTimeOriginal || ""}</span>
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
                <span>{meta?.aperture ? `f/${meta.aperture}` : ""}</span>
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
                <span>{meta?.shutterSpeed || ""}</span>
              </div>

              <div className="flex items-center gap-1.5" title="ISO">
                <span className="font-medium text-text-tertiary">ISO</span>
                <span>{meta?.iso || ""}</span>
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
                <span>{meta?.focalLength || ""}</span>
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
                <span>{meta?.colorSpace || ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

