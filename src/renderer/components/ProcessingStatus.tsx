import type { ProcessingProgress } from "@common/types";
import { formatSize } from "@utils/format";

interface ProcessingStatusProps {
	progress: ProcessingProgress;
	percentage: number;
}

export const ProcessingStatus = ({ progress, percentage }: ProcessingStatusProps) => {
	const radius = 70;
	const stroke = 6;
	const normalizedRadius = radius - stroke * 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	return (
		<div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
			<div className="relative flex items-center justify-center">
				{/* Background Circle */}
				<svg
					height={radius * 2}
					width={radius * 2}
					className="-rotate-90 transition-all duration-300"
				>
					<title>Conversion Progress</title>
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
				<div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2 text-center">
					<span className="text-2xl font-bold mb-0.5">{Math.round(percentage)}%</span>
					<span className="text-[10px] text-white/90 font-medium mb-1">
						{progress.completed} / {progress.total}
					</span>
					{progress.savedBytes !== undefined && progress.savedBytes > 0 && (
						<span className="text-[9px] text-green-400 font-semibold bg-green-900/40 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm ring-1 ring-green-400/20">
							{formatSize(progress.savedBytes)} saved
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
