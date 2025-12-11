import type { ProcessingProgress } from "@common/types";
import { formatSize } from "@utils/format";

interface ProcessingStatusProps {
  progress: ProcessingProgress;
  percentage: number;
}

export const ProcessingStatus = ({
  progress,
  percentage,
}: ProcessingStatusProps) => {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="relative flex items-center justify-center">
        {/* Background Circle */}
        <svg
          height={radius * 2}
          width={radius * 2}
          className="-rotate-90 transition-all duration-300"
        >
          <circle
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={stroke}
            fill="rgba(0, 0, 0, 0.6)"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#22c55e" // Green-500
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
          <span className="text-5xl font-bold mb-2">
            {Math.round(percentage)}%
          </span>
          <span className="text-lg text-white/90 font-medium mb-1.5">
            Photos {progress.completed} / {progress.total}
          </span>
          {progress.savedBytes !== undefined && progress.savedBytes > 0 && (
            <span className="text-sm text-green-400 font-semibold bg-green-900/30 px-3 py-1 rounded-full">
              {formatSize(progress.savedBytes)} saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
