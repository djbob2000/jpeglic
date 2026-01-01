import { useState } from "react";

interface ReplaceWarningModalProps {
	isOpen: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	onDontShowAgain: (value: boolean) => void;
}

export const ReplaceWarningModal = ({
	isOpen,
	onConfirm,
	onCancel,
	onDontShowAgain,
}: ReplaceWarningModalProps) => {
	const [dontShowAgain, setDontShowAgain] = useState(false);

	if (!isOpen) return null;

	const handleConfirm = () => {
		if (dontShowAgain) {
			onDontShowAgain(true);
		}
		onConfirm();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-2xl bg-surface-1 p-8 shadow-2xl border border-border">
				{/* Icon */}
				<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
					<img src="/icon.svg" alt="Jpeglic" className="h-10 w-10" />
				</div>

				{/* Title */}
				<h2 className="mb-4 text-center text-xl font-bold text-text-primary">
					Note: files will be replaced
				</h2>

				{/* Description */}
				<p className="mb-8 text-center text-sm text-text-secondary leading-relaxed">
					Jpeglic will overwrite your original photo files, replacing them with Jpegli optimized
					versions
				</p>

				{/* Don't show again */}
				<div className="mb-8 flex justify-center">
					<label className="flex items-center gap-3 cursor-pointer group">
						<div className="relative flex items-center">
							<input
								type="checkbox"
								checked={dontShowAgain}
								onChange={(e) => setDontShowAgain(e.target.checked)}
								className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-text-tertiary bg-transparent transition-all checked:border-primary checked:bg-primary hover:border-primary"
							/>
							<svg
								className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Checked</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
							Don't show again
						</span>
					</label>
				</div>

				{/* Buttons */}
				<div className="flex flex-col gap-3">
					<button
						type="button"
						onClick={handleConfirm}
						className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
					>
						Continue
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="w-full rounded-lg border border-text-tertiary/30 bg-transparent py-3 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2 hover:border-text-tertiary/50 active:scale-[0.98]"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};
