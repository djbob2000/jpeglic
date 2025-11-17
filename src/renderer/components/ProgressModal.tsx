import type { ProcessingProgress } from "../../common/types";

interface ProgressModalProps {
	isOpen: boolean;
	progress: ProcessingProgress;
	percentage: number;
	status: string;
	onCancel: () => Promise<void> | void;
}

export const ProgressModal = ({
	isOpen,
	progress,
	percentage,
	status,
	onCancel,
}: ProgressModalProps) => {
	if (!isOpen) {
		return null;
	}

	const normalizedCompleted = Math.min(progress.completed, progress.total);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
				<h3 className="text-lg font-semibold text-slate-700">Converting...</h3>
				<div className="mt-4 h-6 w-full overflow-hidden rounded-full bg-slate-200">
					<div
						className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all"
						style={{ width: `${percentage}%` }}
					/>
				</div>
				<p className="mt-3 text-center text-sm font-semibold text-slate-700">
					{normalizedCompleted} / {progress.total}
				</p>
				{status && <p className="mt-1 truncate text-center text-xs text-slate-500">{status}</p>}
				<button
					type="button"
					onClick={onCancel}
					className="button-secondary mt-6 w-full rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				>
					Cancel
				</button>
			</div>
		</div>
	);
};
