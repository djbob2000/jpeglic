import {
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@utils/cn";
import type {
  InputItem,
  ProcessingProgress,
  ProcessingSettings,
} from "@common/types";
import { formatSize } from "@utils/format";
import { ProcessingStatus } from "./ProcessingStatus";

type FileWithPath = File & { path?: string };

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
  onAddFiles: (paths: string[]) => Promise<void> | void;
  onOpenSettings: () => void;
  settings: ProcessingSettings;
  isConverting: boolean;
  percentage: number;
}

export const PreviewPanel = ({
  selectedItem,
  processing,
  onAddFiles,
  onOpenSettings,
  settings,
  isConverting,
  percentage,
}: PreviewPanelProps) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previousData, setPreviousData] = useState<PreviewData | null>(null);
  const [isDragOver, setDragOver] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const activeItem = processing?.currentItem ?? selectedItem;

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

  const handleDrop = async (
    event: DragEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    event.preventDefault();
    setDragOver(false);

    const files = Array.from(event.dataTransfer?.files ?? []);
    const paths = files
      .map((file) => window.electron.utils.getPathForFile(file))
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

  useEffect(() => {
    if (activeItem) {
      // Transition logic: When switching items, keep the old image visible
      // until the new one is ready.
      const { data: currentData, loaded: currentLoaded } =
        currentDataRef.current;
      if (currentData && currentLoaded) {
        setPreviousData(currentData);
      }

      setIsImageLoaded(false);

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
      setPreviousData(null);
    }
  }, [activeItem?.sourcePath]);

  if (!activeItem) {
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
              : "border-border bg-surface-2 shadow-md"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75m-7.5 6.75h12a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-12a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-base font-medium text-text-primary">
              Drop files here
            </div>
            <div className="text-sm text-text-tertiary">or click to browse</div>
          </div>
        </button>

        {/* Settings Button */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
          <span className="text-xs text-text-tertiary font-medium px-2">
            {getSettingsText()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="p-3 rounded-full bg-surface-2 text-text-secondary hover:text-primary hover:bg-surface-3 shadow-lg transition-all"
            title="Open Configuration"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
  const activePreviewData = isImageLoaded
    ? previewData
    : previousData || previewData;
  const { metadata } = activePreviewData || {};
  const exif = metadata?.exif;

  // Extract useful info from exiftool data
  // exiftool returns a flat structure with many potential date fields
  const dateTaken =
    exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
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

  const dimensions =
    metadata?.width && metadata?.height
      ? `${metadata.width} × ${metadata.height}`
      : null;

  const aperture = exif?.FNumber;
  const shutterSpeed = exif?.ExposureTime;
  const iso = exif?.ISO;
  const lens = exif?.LensModel || exif?.Lens;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-surface-1 transition-colors",
        isDragOver && "bg-primary/5"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* ... Settings Button ... (unchanged) */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
        <span className="text-xs text-text-tertiary font-medium px-2 bg-surface-1/80 backdrop-blur-sm rounded">
          {getSettingsText()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="p-3 rounded-full bg-surface-2 text-text-secondary hover:text-primary hover:bg-surface-3 shadow-lg transition-all"
          title="Open Configuration"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
        {isConverting && processing && (
          <ProcessingStatus progress={processing} percentage={percentage} />
        )}

        {/* Previous Image (Background during transition) */}
        {previousData?.data && (
          <img
            src={previousData.data}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            aria-hidden="true"
          />
        )}

        {/* Current Image (Foreground) */}
        {previewData?.data ? (
          <img
            src={previewData.data}
            alt={activeItem.displayName}
            className={cn(
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-in-out",
              isImageLoaded ? "opacity-100" : "opacity-0"
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
              title={activeItem.displayName}
            >
              {activeItem.displayName}
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
              <span>{formatSize(activeItem.sizeBytes)}</span>
              {dimensions && (
                <>
                  <span className="text-text-tertiary">•</span>
                  <span>{dimensions}</span>
                </>
              )}
              {creationDate && (
                <>
                  <span className="text-text-tertiary">•</span>
                  <span>
                    {creationDate.toLocaleDateString()}{" "}
                    {creationDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* EXIF Data - Reserved Height Container */}
          <div className="w-full max-w-2xl min-h-14 flex items-center justify-center">
            {(camera || aperture || shutterSpeed || iso || lens) && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-secondary border-t border-border/50 pt-3 w-full animate-in fade-in duration-300">
                {camera && (
                  <div className="flex items-center gap-1.5" title="Camera">
                    <svg
                      className="w-4 h-4 text-text-tertiary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
                    <span>{camera}</span>
                  </div>
                )}
                {lens && (
                  <div className="flex items-center gap-1.5" title="Lens">
                    <svg
                      className="w-4 h-4 text-text-tertiary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>{lens}</span>
                  </div>
                )}
                {aperture && (
                  <div className="flex items-center gap-1.5" title="Aperture">
                    <span className="font-medium text-text-tertiary">ƒ/</span>
                    <span>{aperture}</span>
                  </div>
                )}
                {shutterSpeed && (
                  <div
                    className="flex items-center gap-1.5"
                    title="Shutter Speed"
                  >
                    <svg
                      className="w-4 h-4 text-text-tertiary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{shutterSpeed}s</span>
                  </div>
                )}
                {iso && (
                  <div className="flex items-center gap-1.5" title="ISO">
                    <span className="font-medium text-text-tertiary">ISO</span>
                    <span>{iso}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
