import type { ProcessingSettings } from "../../common/types";

interface SettingsTabProps {
	settings: ProcessingSettings["advanced"];
	onChange: <K extends keyof ProcessingSettings["advanced"]>(
		key: K,
		value: ProcessingSettings["advanced"][K],
	) => void;
}

export const SettingsTab = ({ settings, onChange }: SettingsTabProps) => (
	<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
		<section className="rounded-xl bg-white p-6 shadow-sm">
			<label className="flex flex-col gap-2 text-sm text-slate-600">
				<span className="text-base font-semibold text-slate-700">Concurrency</span>
				<input
					type="number"
					min={1}
					max={32}
					value={settings.concurrency}
					onChange={(event) =>
						onChange("concurrency", Math.max(1, Number(event.target.value) || 1))
					}
					className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</label>
		</section>

		<section className="rounded-xl bg-white p-6 shadow-sm">
			<h3 className="text-base font-semibold text-slate-700">Metadata</h3>
			<div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={settings.preserveMetadata}
						onChange={(event) => onChange("preserveMetadata", event.target.checked)}
						className="h-4 w-4 text-blue-600 focus:ring-blue-500"
					/>
					Preserve metadata
				</label>
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={settings.preserveTimestamps}
						onChange={(event) => onChange("preserveTimestamps", event.target.checked)}
						className="h-4 w-4 text-blue-600 focus:ring-blue-500"
					/>
					Preserve timestamps
				</label>
			</div>
		</section>

		<section className="rounded-xl bg-white p-6 shadow-sm">
			<h3 className="text-base font-semibold text-slate-700">After Conversion</h3>
			<div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={settings.deleteOriginals}
						onChange={(event) => onChange("deleteOriginals", event.target.checked)}
						className="h-4 w-4 text-blue-600 focus:ring-blue-500"
					/>
					Delete originals
				</label>
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={settings.clearInputAfterConversion}
						onChange={(event) => onChange("clearInputAfterConversion", event.target.checked)}
						className="h-4 w-4 text-blue-600 focus:ring-blue-500"
					/>
					Clear input list
				</label>
			</div>
		</section>

		<section className="rounded-xl bg-white p-6 shadow-sm">
			<h3 className="text-base font-semibold text-slate-700">Sound</h3>
			<div className="mt-3 flex flex-col gap-4 text-sm text-slate-600">
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={settings.playSoundOnFinish}
						onChange={(event) => onChange("playSoundOnFinish", event.target.checked)}
						className="h-4 w-4 text-blue-600 focus:ring-blue-500"
					/>
					Play sound on finish
				</label>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<span className="font-medium text-slate-700">Volume</span>
					<div className="flex w-full max-w-md items-center gap-4">
						<input
							type="range"
							min={0}
							max={100}
							value={settings.soundVolume}
							onChange={(event) => onChange("soundVolume", Number(event.target.value))}
							className="range-input"
						/>
						<span className="w-12 text-right text-sm font-semibold text-slate-700">
							{settings.soundVolume}
						</span>
					</div>
				</div>
			</div>
		</section>
	</div>
);
