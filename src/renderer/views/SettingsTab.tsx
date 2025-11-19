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
}

export const SettingsTab = ({
	settings,
	onOutputChange,
	onDownscaleChange,
	onAdvancedChange,
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

	const handleReset = () => {
		onOutputChange("format", "jpeg");
		onOutputChange("quality", 80);
		onOutputChange("visuallyLossless", false);
		onOutputChange("destination", "source");
		onOutputChange("keepFolderStructure", true);
		onOutputChange("renameStrategy", "rename");
		onOutputChange("suffix", "");
		// Concurrency is handled by backend/defaults, but we can reset it to default if needed, though UI is gone.
		// onAdvancedChange("concurrency", 4);
		onAdvancedChange("skipProcessed", false);
		onAdvancedChange("preserveMetadata", true);
		onAdvancedChange("preserveTimestamps", true);
		onAdvancedChange("deleteOriginals", false);
		onAdvancedChange("playSoundOnFinish", true);
		onAdvancedChange("soundVolume", 100);
		onAdvancedChange("clearInputAfterConversion", true);
		onDownscaleChange("mode", "none");
		onDownscaleChange("allowEnlarge", false);
		onDownscaleChange("resampling", "lanczos3");
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="panel">
				<div className="p-6 space-y-8">
					{/* Top Section: Save To & Format/Quality */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
						{/* Left Column: Save To Settings */}
						<fieldset className="space-y-3">
							<legend className="mb-3 block text-sm font-medium text-text-secondary uppercase tracking-wider">
								Save To
							</legend>
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
								<span className="text-text-secondary">Source Folder</span>
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
								<span className="text-text-secondary">Custom</span>
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
									onChange={(event) =>
										onOutputChange("keepFolderStructure", event.target.checked)
									}
									className="checkbox-input"
								/>
								<span className="text-text-secondary">Keep Folder Structure</span>
							</label>
						</fieldset>

						{/* Right Column: Format & Quality */}
						<div className="space-y-4">
							<div>
								<label className="mb-2 block text-sm font-medium text-text-secondary uppercase tracking-wider">
									Format
								</label>
								<div className="form-control w-full flex items-center text-text-primary bg-surface-3/50 cursor-not-allowed opacity-75">
									JPEG (Codec JPEGli)
								</div>
							</div>

							{/* Visually Lossless Switch */}
							<label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors hover:bg-surface-3">
								<span className="text-sm font-medium text-text-primary">
									Visually Lossless (recommended)
								</span>
								<div className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={settings.output.visuallyLossless}
										onChange={(event) =>
											onOutputChange("visuallyLossless", event.target.checked)
										}
										className="peer sr-only"
									/>
									<div className="h-6 w-11 rounded-full bg-surface-4 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
								</div>
							</label>

							<div className={settings.output.visuallyLossless ? "opacity-50 pointer-events-none" : ""}>
								<label
									htmlFor="quality-range"
									className="mb-2 block text-sm font-medium text-text-secondary uppercase tracking-wider"
								>
									Quality
								</label>
								<div className="flex items-center gap-4">
									<input
										id="quality-range"
										type="range"
										min={1}
										max={100}
										value={settings.output.quality}
										onChange={(event) =>
											onOutputChange("quality", Number(event.target.value))
										}
										disabled={settings.output.visuallyLossless}
										className="range-input flex-1"
									/>
									<span className="w-8 text-right font-semibold text-primary">
										{settings.output.quality}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t border-border" />

					{/* Downscale & Rename Strategy Combined Grid */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
						{/* Left Column: Downscale Settings */}
						<div className="space-y-6">
							<div>
								<label
									htmlFor="downscale-mode-select"
									className="mb-2 block text-sm font-medium text-text-secondary uppercase tracking-wider"
								>
									Downscale Mode
								</label>
								<select
									id="downscale-mode-select"
									value={downscale.mode}
									onChange={(event) =>
										onDownscaleChange(
											"mode",
											event.target.value as typeof downscale.mode,
										)
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
								<div className="grid grid-cols-2 gap-4">
									{showDimensions && (
										<>
											<div>
												<label
													htmlFor="width-input"
													className="mb-2 block text-sm text-text-secondary"
												>
													Width
												</label>
												<input
													id="width-input"
													type="number"
													min={1}
													value={downscale.width ?? ""}
													onChange={(event) =>
														onDownscaleChange(
															"width",
															event.target.value
																? Number(event.target.value)
																: undefined,
														)
													}
													className="form-control w-full"
												/>
											</div>
											<div>
												<label
													htmlFor="height-input"
													className="mb-2 block text-sm text-text-secondary"
												>
													Height
												</label>
												<input
													id="height-input"
													type="number"
													min={1}
													value={downscale.height ?? ""}
													onChange={(event) =>
														onDownscaleChange(
															"height",
															event.target.value
																? Number(event.target.value)
																: undefined,
														)
													}
													className="form-control w-full"
												/>
											</div>
										</>
									)}
									{showValue && (
										<div className="col-span-2">
											<label
												htmlFor="value-input"
												className="mb-2 block text-sm text-text-secondary"
											>
												Value
											</label>
											<input
												id="value-input"
												type="number"
												min={1}
												value={downscale.value ?? ""}
												onChange={(event) =>
													onDownscaleChange(
														"value",
														event.target.value
															? Number(event.target.value)
															: undefined,
													)
												}
												className="form-control w-full"
											/>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Right Column: Rename Strategy & Checkboxes */}
						<div className="space-y-6">
							<div>
								<label
									htmlFor="rename-strategy-select"
									className="mb-2 block text-sm font-medium text-text-secondary uppercase tracking-wider"
								>
									If Output Exists
								</label>
								<select
									id="rename-strategy-select"
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
							{settings.output.renameStrategy === "rename" && (
								<div>
									<label
										htmlFor="suffix-input"
										className="mb-2 block text-sm font-medium text-text-secondary uppercase tracking-wider"
									>
										Suffix
									</label>
									<input
										id="suffix-input"
										type="text"
										value={settings.output.suffix}
										onChange={(event) => onOutputChange("suffix", event.target.value)}
										placeholder="e.g., _converted"
										className="form-control w-full"
									/>
								</div>
							)}

							{/* Checkboxes */}
							<div className="space-y-3 pt-2">
								{downscale.mode !== "none" && (
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={downscale.allowEnlarge}
											onChange={(event) =>
												onDownscaleChange("allowEnlarge", event.target.checked)
											}
											className="checkbox-input"
										/>
									<span className="text-text-secondary">Allow enlarge</span>
								</label>
								)}
								<label className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={settings.advanced.skipProcessed}
										onChange={(event) =>
											onAdvancedChange("skipProcessed", event.target.checked)
										}
										className="checkbox-input"
									/>
									<span className="text-text-secondary">Skip already compressed files</span>
								</label>
								<label className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={settings.advanced.preserveMetadata}
										onChange={(event) =>
											onAdvancedChange("preserveMetadata", event.target.checked)
										}
										className="checkbox-input"
									/>
									<span className="text-text-secondary">Preserve metadata (recommended)</span>
								</label>
								<label className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={settings.advanced.preserveTimestamps}
										onChange={(event) =>
											onAdvancedChange("preserveTimestamps", event.target.checked)
										}
										className="checkbox-input"
									/>
									<span className="text-text-secondary">Preserve timestamps (recommended)</span>
								</label>
								<label
									className={`flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-all ${
										settings.advanced.deleteOriginals
											? "bg-red-500/10"
											: "hover:bg-surface-3"
									}`}
								>
									<input
										type="checkbox"
										checked={settings.advanced.deleteOriginals}
										onChange={(event) =>
											onAdvancedChange("deleteOriginals", event.target.checked)
										}
										className={`checkbox-input ${
											settings.advanced.deleteOriginals ? "accent-red-500" : ""
										}`}
									/>
									<span
										className={
											settings.advanced.deleteOriginals
												? "font-medium text-red-500"
												: "text-text-secondary"
										}
									>
										Delete originals
									</span>
								</label>
								<label className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={settings.advanced.playSoundOnFinish}
										onChange={(event) =>
											onAdvancedChange("playSoundOnFinish", event.target.checked)
										}
										className="checkbox-input"
									/>
									<span className="text-text-secondary">Play sound on finish</span>
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
									<span className="text-text-secondary">
										Clear input list after conversion
									</span>
								</label>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Reset Button */}
			<div className="flex justify-start">
				<button
					type="button"
					onClick={handleReset}
					className="btn-secondary px-4 py-2 text-sm"
				>
					Reset to Default
				</button>
			</div>
		</div>
	);
};
