import type { ProcessingProgress, ProcessingResult } from "@common/types";

interface ProgressModalProps {
  isOpen: boolean;
  progress: ProcessingProgress;
  percentage: number;
  status: string;
  onCancel: () => Promise<void> | void;
  result: ProcessingResult | null;
  onClose: () => void;
}

export const ProgressModal = ({
  isOpen,
  progress,
  percentage,
  status,
  onCancel,
  result,
  onClose,
}: ProgressModalProps) => {
  if (!isOpen) {
    return null;
  }

  const isFinished = !!result;
  const normalizedCompleted = Math.min(progress.completed, progress.total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface-2 p-6 shadow-xl border border-border">
        <h3 className="text-lg font-semibold text-text-primary">
          {isFinished ? "Conversion Finished" : "Converting..."}
        </h3>

        {!isFinished ? (
          <>
            <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-text-secondary truncate max-w-[70%]">
                {status}
              </span>
              <span className="font-medium text-text-primary">
                {normalizedCompleted} / {progress.total}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary mt-6 w-full justify-center"
            >
              Cancel
            </button>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Successful:</span>
                <span className="font-medium text-green-500">
                  {result.successCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Skipped:</span>
                <span className="font-medium text-yellow-500">
                  {result.skippedCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Failed:</span>
                <span className="font-medium text-red-500">
                  {result.failedCount}
                </span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto rounded-lg bg-surface-3 p-3 text-xs">
                <div className="mb-2 font-medium text-red-400">Errors:</div>
                <ul className="space-y-1 text-text-secondary">
                  {result.errors.map((entry, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: List is static for display
                    <li key={index} className="truncate">
                      • {entry.item.displayName}: {entry.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-primary mt-2 w-full justify-center"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
