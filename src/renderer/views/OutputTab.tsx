import type { ProcessingSettings } from "../../common/types";

interface OutputTabProps {
	settings: ProcessingSettings["output"];
	onChange: <K extends keyof ProcessingSettings["output"]>(
		key: K,
		value: ProcessingSettings["output"][K],
	) => void;
	onStartConversion: () => void;
	hasItems: boolean;
}

export const OutputTab = ({ settings, onChange, onStartConversion, hasItems }: OutputTabProps) => {
	const handleDestinationChange = (value: ProcessingSettings["output"]["destination"]) => {
		onChange("destination", value);
		if (value === "source") {
			onChange("customDirectory", undefined);
		}
	};

	const browseDirectory = async () => {
		const directory = await window.electron.dialog.openDirectory();
		if (directory) {
			onChange("customDirectory", directory);
			onChange("destination", "custom");
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
			<section className="rounded-xl bg-white p-6 shadow-sm">
				<h3 className="text-base font-semibold text-slate-700">Output Format</h3>
				<div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
					{[
						{ label: "JPEG XL", value: "jxl" },
						{ label: "AVIF", value: "avif" },
						{ label: "WebP", value: "webp" },
						{ label: "JPEG", value: "jpeg" },
						{ label: "PNG", value: "png" },
					].map((option) => (
						<label
							key={option.value}
							className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
						>
							<input
								type="radio"
								className="h-4 w-4 text-blue-600 focus:ring-blue-500"
								name="format"
								value={option.value}
								checked={settings.format === option.value}
								onChange={() =>
									onChange("format", option.value as ProcessingSettings["output"]["format"])
								}
							/>
							{option.label}
						</label>
					))}
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="flex-1">
						<h3 className="text-base font-semibold text-slate-700">Quality</h3>
						<p className="text-sm text-slate-500">Adjust compression quality (1-100).</p>
					</div>
					<div className="flex w-full max-w-md items-center gap-4">
						<input
							type="range"
							min={1}
							max={100}
							value={settings.quality}
							onChange={(event) => onChange("quality", Number(event.target.value))}
							className="range-input"
						/>
						<span className="w-12 text-right text-sm font-semibold text-slate-700">
							{settings.quality}
						</span>
					</div>
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="flex-1">
						<h3 className="text-base font-semibold text-slate-700">Effort</h3>
						<p className="text-sm text-slate-500">
							Encoding speed vs. compression efficiency (1-9).
						</p>
					</div>
					<div className="flex w-full max-w-md items-center gap-4">
						<input
							type="range"
							min={1}
							max={9}
							value={settings.effort}
							onChange={(event) => onChange("effort", Number(event.target.value))}
							className="range-input"
						/>
						<span className="w-12 text-right text-sm font-semibold text-slate-700">
							{settings.effort}
						</span>
					</div>
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-3 text-sm text-slate-600">
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.lossless}
							onChange={(event) => onChange("lossless", event.target.checked)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500"
						/>
						Lossless
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.keepAlpha}
							onChange={(event) => onChange("keepAlpha", event.target.checked)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500"
						/>
						Keep Alpha Channel
					</label>
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<h3 className="text-base font-semibold text-slate-700">Destination</h3>
				<div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
					<label className="flex items-center gap-3">
						<input
							type="radio"
							name="destination"
							value="source"
							checked={settings.destination === "source"}
							onChange={() => handleDestinationChange("source")}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500"
						/>
						Same as source
					</label>
					<label className="flex items-center gap-3">
						<input
							type="radio"
							name="destination"
							value="custom"
							checked={settings.destination === "custom"}
							onChange={() => handleDestinationChange("custom")}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500"
						/>
						Custom directory
					</label>
					<div className="flex flex-col gap-3 sm:flex-row">
						<input
							type="text"
							value={settings.customDirectory ?? ""}
							onChange={(event) => onChange("customDirectory", event.target.value || undefined)}
							disabled={settings.destination !== "custom"}
							placeholder="Select directory..."
							className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
						/>
						<button
							type="button"
							onClick={browseDirectory}
							disabled={settings.destination !== "custom"}
							className="button-secondary rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
						>
							Browse
						</button>
					</div>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.keepFolderStructure}
							onChange={(event) => onChange("keepFolderStructure", event.target.checked)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500"
						/>
						Keep folder structure
					</label>
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<h3 className="text-base font-semibold text-slate-700">Rename Strategy</h3>
				<div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
					{[
						{ label: "Overwrite existing", value: "overwrite" },
						{ label: "Skip existing", value: "skip" },
						{ label: "Rename duplicates", value: "rename" },
					].map((option) => (
						<label
							key={option.value}
							className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
						>
							<input
								type="radio"
								name="rename"
								value={option.value}
								checked={settings.renameStrategy === option.value}
								onChange={() =>
									onChange(
										"renameStrategy",
										option.value as ProcessingSettings["output"]["renameStrategy"],
									)
								}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500"
							/>
							{option.label}
						</label>
					))}
				</div>
			</section>

			<section className="rounded-xl bg-white p-6 shadow-sm">
				<label className="flex flex-col gap-2 text-sm text-slate-600">
					<span className="text-base font-semibold text-slate-700">Suffix</span>
					<input
						type="text"
						value={settings.suffix}
						onChange={(event) => onChange("suffix", event.target.value)}
						placeholder="e.g., _converted"
						className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
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
