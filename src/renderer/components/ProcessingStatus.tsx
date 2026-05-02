import type { ProcessingProgress } from "@common/types";
import { formatSize } from "@utils/format";
import { memo, useMemo } from "react";

interface ProcessingStatusProps {
  progress: ProcessingProgress;
  percentage: number;
}

const RADIUS = 105;
const STROKE = 9;
const NORMALIZED_RADIUS = RADIUS - STROKE * 2;
const CIRCUMFERENCE = NORMALIZED_RADIUS * 2 * Math.PI;
const DASH_ARRAY = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

export const ProcessingStatus = memo(({ progress, percentage }: ProcessingStatusProps) => {
  const strokeDashoffset = useMemo(
    () => CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE,
    [percentage],
  );

  const roundedPercentage = Math.round(percentage);

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="relative flex items-center justify-center">
        {/* Background Circle */}
        <svg
          height={RADIUS * 2}
          width={RADIUS * 2}
          className="-rotate-90 transition-all duration-300"
        >
          <title>Conversion Progress</title>
          <circle
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={STROKE}
            fill="rgba(0, 0, 0, 0.6)"
            r={NORMALIZED_RADIUS}
            cx={RADIUS}
            cy={RADIUS}
          />
          <circle
            stroke="#22c55e"
            strokeWidth={STROKE}
            strokeDasharray={DASH_ARRAY}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            fill="transparent"
            r={NORMALIZED_RADIUS}
            cx={RADIUS}
            cy={RADIUS}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2 text-center">
          <span className="text-4xl font-bold mb-1">{roundedPercentage}%</span>
          <span className="text-[15px] text-white/90 font-medium mb-1.5">
            {progress.completed} / {progress.total}
          </span>
          {progress.savedBytes != null && progress.savedBytes > 0 && (
            <span className="text-[13px] text-green-400 font-semibold bg-green-900/40 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm ring-1 ring-green-400/20">
              {formatSize(progress.savedBytes)} saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
