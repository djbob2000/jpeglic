import type { ProcessingSettings } from "../../common/types";

interface SettingsTabProps {
	settings: ProcessingSettings;
	onOutputChange: <K extends keyof ProcessingSettings["output"]>(
		key: K,
		value: ProcessingSettings["output"][K],
	) => void;
	onDownscaleChange: <K extends keyof ProcessingSettings["downscale"]>(
		key: K,
		value: ProcessingSettings["downscale"][K],
	) => void;
	onAdvancedChange: <K extends keyof ProcessingSettings["advanced"]>(
		key: K,
		value: ProcessingSettings["advanced"][K],
	) => void;
	onStartConversion: () => void;
	hasItems: boolean;
}

export const SettingsTab = ({
	settings,
	onOutputChange,
	onDownscaleChange,
	onAdvancedChange,
	onStartConversion,
	hasItems,
}: SettingsTabProps) => {
	const { downscale } = settings;
	const showDimensions = downscale.mode === "dimensions";
	const showValue = ["percentage", "longer-side", "shorter-side", "megapixels"].includes(
		downscale.mode,
	);

	const handleDestinationChange = (value: ProcessingSettings["output"]["destination"]) => {
		onOutputChange("destination", value);
		if (value === "source") {
			onOutputChange("customDirectory", undefined);
		}
	};

	const browseDirectory = async () => {
		const directory = await window.electron.dialog.openDirectory();
		if (directory) {
			onOutputChange("customDirectory", directory);
			onOutputChange("destination", "custom");
		}
	};

	return (
		<div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 p-4">
			{/* Output Settings Section */}
			<div className="panel">
				<div className="panel-header-centered">
					<span className="panel-title">Output Settings</span>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Save To Settings */}
					<div>
						<fieldset className="space-y-3">
							<legend className="block text-sm text-secondary mb-3">Save To</legend>
							<label className="flex items-center gap-3">
								<input
									id="destination-source"
									type="radio"
									name="destination"
									value="source"
									checked={settings.output.destination === "source"}
									onChange={() => handleDestinationChange("source")}
									className="radio-input"
								/>
								<span className="text-secondary">Source Folder</span>
							</label>
							<label className="flex items-center gap-3">
								<input
									id="destination-custom"
									type="radio"
									name="destination"
									value="custom"
									checked={settings.output.destination === "custom"}
									onChange={() => handleDestinationChange("custom")}
									className="radio-input"
								/>
								<span className="text-secondary">Custom</span>
							</label>
							<div className="flex gap-2 pl-6">
								<input
									type="text"
									value={settings.output.customDirectory ?? ""}
									onChange={(event) =>
										onOutputChange("customDirectory", event.target.value || undefined)
									}
									disabled={settings.output.destination !== "custom"}
									placeholder="/home/user/Pictures"
									className="form-control flex-1"
								/>
								<button
									type="button"
									onClick={browseDirectory}
									disabled={settings.output.destination !== "custom"}
									className="btn-secondary px-3 py-2"
								>
									...
								</button>
							</div>
							<label className="flex items-center gap-3">
								<input
									type="checkbox"
									checked={settings.output.keepFolderStructure}
									onChange={(event) => onOutputChange("keepFolderStructure", event.target.checked)}
									className="checkbox-input"
								/>
								<span className="text-secondary">Keep Folder Structure</span>
							</label>
						</fieldset>
					</div>

					{/* Format Settings */}
					<div>
						<fieldset className="space-y-4">
							<legend className="block text-sm text-secondary mb-3">Format Settings</legend>
							<div>
								<label htmlFor="format-select" className="block text-sm text-secondary mb-2">Format</label>
								<select id="format-select"
									value={settings.output.format}
									onChange={(event) =>
										onOutputChange(
											"format",
											event.target.value as ProcessingSettings["output"]["format"],
										)
									}
									className="form-control w-full"
								>
									<option value="jxl">JPEG XL</option>
									<option value="avif">AVIF</option>
									<option value="webp">WebP</option>
									<option value="jpeg">JPEG</option>
									<option value="png">PNG</option>
								</select>
							</div>
							<div>
								<label htmlFor="quality-range" className="block text-sm text-secondary mb-2">Quality</label>
								<div className="flex items-center gap-4">
									<input id="quality-range"
										type="range"
										min={1}
										max={100}
										value={settings.output.quality}
										onChange={(event) => onOutputChange("quality", Number(event.target.value))}
										className="range-input flex-1"
									/>
									<span className="text-primary font-semibold w-8 text-right">
										{settings.output.quality}
									</span>
								</div>
							</div>
							<div>
								<label htmlFor="effort-range" className="block text-sm text-secondary mb-2">Effort</label>
								<div className="flex items-center gap-4">
									<input id="effort-range"
										type="range"
										min={1}
										max={9}
										value={settings.output.effort}
										onChange={(event) => onOutputChange("effort", Number(event.target.value))}
										className="range-input flex-1"
									/>
									<span className="text-primary font-semibold w-8 text-right">
										{settings.output.effort}
									</span>
								</div>
							</div>
							<label className="flex items-center gap-3">
								<input
									type="checkbox"
									checked={settings.output.lossless}
									onChange={(event) => onOutputChange("lossless", event.target.checked)}
									className="checkbox-input"
								/>
								<span className="text-secondary">Lossless</span>
							</label>
							<label className="flex items-center gap-3">
								<input
									type="checkbox"
									checked={settings.output.keepAlpha}
									onChange={(event) => onOutputChange("keepAlpha", event.target.checked)}
									className="checkbox-input"
								/>
								<span className="text-secondary">Keep Alpha Channel</span>
							</label>
						</fieldset>
					</div>
				</div>

				{/* Rename and Output Options */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<label htmlFor="rename-strategy-select" className="block text-sm text-secondary mb-2">If Output Exists</label>
						<select id="rename-strategy-select"
							value={settings.output.renameStrategy}
							onChange={(event) =>
								onOutputChange(
									"renameStrategy",
									event.target.value as ProcessingSettings["output"]["renameStrategy"],
								)
							}
							className="form-control w-full"
						>
							<option value="rename">Rename</option>
							<option value="overwrite">Overwrite existing</option>
							<option value="skip">Skip existing</option>
						</select>
					</div>
					<div>
						<label htmlFor="suffix-input" className="block text-sm text-secondary mb-2">Suffix</label>
						<input id="suffix-input"
							type="text"
							value={settings.output.suffix}
							onChange={(event) => onOutputChange("suffix", event.target.value)}
							placeholder="e.g., _converted"
							className="form-control w-full"
						/>
					</div>
				</div>
			</div>

			{/* Modify Settings Section */}
			<div className="panel">
				<div className="panel-header-centered">
					<span className="panel-title">Modify Settings</span>
				</div>
				<div className="space-y-6">
					<div>
						<label htmlFor="downscale-mode-select" className="block text-sm text-secondary mb-2">Downscale Mode</label>
						<select id="downscale-mode-select"
							value={downscale.mode}
							onChange={(event) =>
								onDownscaleChange("mode", event.target.value as typeof downscale.mode)
							}
							className="form-control w-full"
						>
							<option value="none">None</option>
							<option value="dimensions">Dimensions</option>
							<option value="percentage">Percentage</option>
							<option value="longer-side">Longer Side</option>
							<option value="shorter-side">Shorter Side</option>
							<option value="megapixels">Megapixels</option>
						</select>
					</div>

					{(showDimensions || showValue) && (
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{showDimensions && (
								<>
										<div>
											<label htmlFor="width-input" className="block text-sm text-secondary mb-2">Width</label>
											<input id="width-input"
											type="number"
											min={1}
											value={downscale.width ?? ""}
											onChange={(event) =>
												onDownscaleChange(
													"width",
													event.target.value ? Number(event.target.value) : undefined,
												)
											}
											className="form-control w-full"
										/>
										</div>
											<div>
												<label htmlFor="height-input" className="block text-sm text-secondary mb-2">Height</label>
												<input id="height-input"
												type="number"
												min={1}
												value={downscale.height ?? ""}
												onChange={(event) =>
													onDownscaleChange(
														"height",
														event.target.value ? Number(event.target.value) : undefined,
													)
												}
												className="form-control w-full"
											/>
										</div>
								</>
							)}
							{showValue && (
								<div>
												<label htmlFor="value-input" className="block text-sm text-secondary mb-2">Value</label>
												<input id="value-input"
											type="number"
											min={1}
											value={downscale.value ?? ""}
											onChange={(event) =>
												onDownscaleChange(
													"value",
													event.target.value ? Number(event.target.value) : undefined,
												)
											}
											className="form-control w-full"
										/>
								</div>
							)}
						</div>
					)}

					<div>
							<label htmlFor="resampling-select" className="block text-sm text-secondary mb-2">Resampling</label>
							<select id="resampling-select"
								value={downscale.resampling}
								onChange={(event) =>
									onDownscaleChange("resampling", event.target.value as typeof downscale.resampling)
								}
								className="form-control w-full"
							>
								<option value="lanczos3">Lanczos3</option>
								<option value="catmullRom">Catmull-Rom</option>
								<option value="mitchell">Mitchell</option>
								<option value="nearest">Nearest</option>
							</select>
					</div>

					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={downscale.allowEnlarge}
							onChange={(event) => onDownscaleChange("allowEnlarge", event.target.checked)}
							className="checkbox-input"
						/>
						<span className="text-secondary">Allow enlarge</span>
					</label>
				</div>
			</div>

			{/* Advanced Settings Section */}
			<div className="panel">
				<div className="panel-header-centered">
					<span className="panel-title">Advanced Settings</span>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<label htmlFor="concurrency-input" className="block text-sm text-secondary mb-2">Concurrency</label>
						<input id="concurrency-input"
							type="number"
							min={1}
							max={32}
							value={settings.advanced.concurrency}
							onChange={(event) =>
								onAdvancedChange("concurrency", Math.max(1, Number(event.target.value) || 1))
							}
							className="form-control w-full"
						/>
					</div>
					<div>
						<label htmlFor="sound-volume-range" className="block text-sm text-secondary mb-2">Sound Volume</label>
						<div className="flex items-center gap-4">
							<input id="sound-volume-range"
								type="range"
								min={0}
								max={100}
								value={settings.advanced.soundVolume}
								onChange={(event) => onAdvancedChange("soundVolume", Number(event.target.value))}
								className="range-input flex-1"
							/>
							<span className="text-primary font-semibold w-8 text-right">
								{settings.advanced.soundVolume}
							</span>
						</div>
					</div>
				</div>
				<div className="mt-4 space-y-3">
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.advanced.preserveMetadata}
							onChange={(event) => onAdvancedChange("preserveMetadata", event.target.checked)}
							className="checkbox-input"
						/>
						<span className="text-secondary">Preserve metadata</span>
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.advanced.preserveTimestamps}
							onChange={(event) => onAdvancedChange("preserveTimestamps", event.target.checked)}
							className="checkbox-input"
						/>
						<span className="text-secondary">Preserve timestamps</span>
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.advanced.deleteOriginals}
							onChange={(event) => onAdvancedChange("deleteOriginals", event.target.checked)}
							className="checkbox-input"
						/>
						<span className="text-secondary">Delete originals</span>
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.advanced.playSoundOnFinish}
							onChange={(event) => onAdvancedChange("playSoundOnFinish", event.target.checked)}
							className="checkbox-input"
						/>
						<span className="text-secondary">Play sound on finish</span>
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={settings.advanced.clearInputAfterConversion}
							onChange={(event) =>
								onAdvancedChange("clearInputAfterConversion", event.target.checked)
							}
							className="checkbox-input"
						/>
						<span className="text-secondary">Clear input list after conversion</span>
					</label>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-between">
				<button
					type="button"
					onClick={() => {
						// Reset to default settings
						onOutputChange("format", "jxl");
						onOutputChange("quality", 80);
						onOutputChange("effort", 7);
						onOutputChange("lossless", false);
						onOutputChange("keepAlpha", true);
						onOutputChange("destination", "source");
						onOutputChange("keepFolderStructure", true);
						onOutputChange("renameStrategy", "rename");
						onOutputChange("suffix", "");
						onAdvancedChange("concurrency", 4);
						onAdvancedChange("preserveMetadata", true);
						onAdvancedChange("preserveTimestamps", true);
						onAdvancedChange("deleteOriginals", false);
						onAdvancedChange("playSoundOnFinish", true);
						onAdvancedChange("soundVolume", 50);
						onAdvancedChange("clearInputAfterConversion", true);
						onDownscaleChange("mode", "none");
						onDownscaleChange("allowEnlarge", false);
						onDownscaleChange("resampling", "lanczos3");
					}}
					className="btn-secondary px-4 py-2"
				>
					Reset to Default
				</button>
				<button
					type="button"
					onClick={onStartConversion}
					disabled={!hasItems}
					className="btn-primary px-6 py-2"
				>
					Convert
				</button>
			</div>
		</div>
	);
}
