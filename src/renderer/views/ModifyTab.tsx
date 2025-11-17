import type { ProcessingSettings } from "../../common/types";

interface ModifyTabProps {
	settings: ProcessingSettings;
	onDownscaleChange: <K extends keyof ProcessingSettings["downscale"]>(
		key: K,
		value: ProcessingSettings["downscale"][K],
	) => void;
	onStartConversion: () => void;
	hasItems: boolean;
}

export const ModifyTab = ({
	settings,
	onDownscaleChange,
	onStartConversion,
	hasItems,
}: ModifyTabProps) => {
	const { downscale } = settings;
	const showDimensions = downscale.mode === "dimensions";
	const showValue = ["percentage", "longer-side", "shorter-side", "megapixels"].includes(
		downscale.mode,
	);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
			<section className="rounded-xl bg-white p-6 shadow-sm">
				<label className="flex flex-col gap-2 text-sm text-slate-600">
					<span className="text-base font-semibold text-slate-700">Downscale Mode</span>
					<select
						value={downscale.mode}
						onChange={(event) =>
							onDownscaleChange("mode", event.target.value as typeof downscale.mode)
						}
						className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="none">None</option>
						<option value="dimensions">Dimensions</option>
						<option value="percentage">Percentage</option>
						<option value="longer-side">Longer Side</option>
						<option value="shorter-side">Shorter Side</option>
						<option value="megapixels">Megapixels</option>
					</select>
				</label>
			</section>

			{(showDimensions || showValue) && (
				<section className="rounded-xl bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-4 text-sm text-slate-600">
						{showDimensions && (
							<div className="grid gap-4 sm:grid-cols-2">
								<label className="flex flex-col gap-1">
									<span className="font-medium text-slate-700">Width</span>
									<input
										type="number"
										min={1}
										value={downscale.width ?? ""}
										onChange={(event) =>
											onDownscaleChange(
												"width",
												event.target.value ? Number(event.target.value) : undefined,
											)
										}
										className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="font-medium text-slate-700">Height</span>
									<input
										type="number"
										min={1}
										value={downscale.height ?? ""}
										onChange={(event) =>
											onDownscaleChange(
												"height",
												event.target.value ? Number(event.target.value) : undefined,
											)
										}
										className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</label>
							</div>
						)}

						{showValue && (
							<label className="flex flex-col gap-1">
								<span className="font-medium text-slate-700">Value</span>
								<input
									type="number"
									min={1}
									value={downscale.value ?? ""}
									onChange={(event) =>
										onDownscaleChange(
											"value",
											event.target.value ? Number(event.target.value) : undefined,
										)
									}
									className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</label>
						)}

						<label className="flex items-center gap-3">
							<input
								type="checkbox"
								checked={downscale.allowEnlarge}
								onChange={(event) => onDownscaleChange("allowEnlarge", event.target.checked)}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500"
							/>
							Allow enlarge
						</label>
					</div>
				</section>
			)}

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<label className="flex flex-col gap-2 text-sm text-slate-600">
					<span className="text-base font-semibold text-slate-700">Resampling</span>
					<select
						value={downscale.resampling}
						onChange={(event) =>
							onDownscaleChange("resampling", event.target.value as typeof downscale.resampling)
						}
						className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="lanczos3">Lanczos3</option>
						<option value="catmullRom">Catmull-Rom</option>
						<option value="mitchell">Mitchell</option>
						<option value="nearest">Nearest</option>
					</select>
				</label>
			</section>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={onStartConversion}
					disabled={!hasItems}
					className="button-primary rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-300"
				>
					Convert
				</button>
			</div>
		</div>
	);
};
