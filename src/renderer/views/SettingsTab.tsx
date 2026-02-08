import { cn } from "@utils/cn";
import { distanceToQuality } from "@utils/settings";
import tauriAPI from "@utils/tauriAPI";
import { useSettings } from "../contexts/SettingsContext";

export const SettingsTab = () => {
	const { settings, updateOutputSetting, updateAdvancedSetting } = useSettings();

	if (!settings) return null;

	const handleDestinationChange = async (value: "source" | "custom") => {
		if (value === "source") {
			updateOutputSetting("destination", value);
			updateOutputSetting("customDirectory", null);
		} else if (value === "custom") {
			// Automatically open directory picker when custom is selected
			const directory = await tauriAPI.dialog.openDirectory();
			if (directory) {
				updateOutputSetting("customDirectory", directory);
				updateOutputSetting("destination", "custom");
			} else {
				// User cancelled - revert to source
				updateOutputSetting("destination", "source");
				updateOutputSetting("customDirectory", null);
			}
		}
	};

	const browseDirectory = async () => {
		const directory = await tauriAPI.dialog.openDirectory();
		if (directory) {
			updateOutputSetting("customDirectory", directory);
			updateOutputSetting("destination", "custom");
		}
	};

	const onOutputChange = updateOutputSetting;
	const onAdvancedChange = updateAdvancedSetting;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="panel">
				<div className="p-6 space-y-8">
					{/* Main Grid */}
					{/* Main Content */}
					<div className="space-y-6">
						{/* Save To Settings */}
						<fieldset className="space-y-3">
							<legend className="mb-3 block text-sm font-medium text-text-secondary uppercase tracking-wider">
								Save To
							</legend>
							<div className="flex items-center justify-between">
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
									<span className="text-text-secondary">Replace originals</span>
								</label>

								{settings.output.destination === "source" && (
									<label className="flex items-center gap-2 cursor-pointer">
										<span className="text-xs text-text-tertiary">Warn me before replace</span>
										<div className="relative inline-flex items-center">
											<input
												type="checkbox"
												checked={settings.advanced.warnBeforeReplace}
												onChange={(event) =>
													onAdvancedChange("warnBeforeReplace", event.target.checked)
												}
												className="peer sr-only"
											/>
											<div className="h-4 w-7 rounded-full bg-surface-4 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
										</div>
									</label>
								)}
							</div>
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
							{settings.output.destination === "custom" && (
								<div className="space-y-4 pl-6">
									<div className="flex gap-2">
										<input
											type="text"
											value={settings.output.customDirectory ?? ""}
											onChange={(event) =>
												onOutputChange("customDirectory", event.target.value || null)
											}
											placeholder="/home/user/Pictures"
											className="form-control flex-1"
										/>
										<button
											type="button"
											onClick={browseDirectory}
											className="btn-secondary px-3 py-2"
										>
											...
										</button>
									</div>

									<div className="space-y-4 pt-2">
										{/* Keep Folder Structure */}
										<div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">Keep Folder Structure</span>
												<span className="text-xs text-text-tertiary">
													Maintain subfolder hierarchy
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.keepFolderStructure}
													onChange={(e) => onOutputChange("keepFolderStructure", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div>

										{/* Delete Originals */}
										<div
											className={cn(
												"flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-all",
												settings.advanced.deleteOriginals ? "bg-red-500/10" : "hover:bg-surface-3",
											)}
										>
											<div className="flex flex-col">
												<span
													className={cn(
														"font-medium transition-colors",
														settings.advanced.deleteOriginals
															? "text-red-500"
															: "text-text-primary",
													)}
												>
													Delete originals
												</span>
												<span className="text-xs text-text-tertiary">
													Remove source files after conversion
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.advanced.deleteOriginals}
													onChange={(e) => onAdvancedChange("deleteOriginals", e.target.checked)}
													className="peer sr-only"
												/>
												<div
													className={cn(
														"w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
														settings.advanced.deleteOriginals
															? "peer-checked:bg-red-500 peer-focus:ring-red-500/20"
															: "peer-checked:bg-primary peer-focus:ring-primary/20",
													)}
												></div>
											</label>
										</div>
									</div>
								</div>
							)}

							{/* cjpegli Settings (Only for JPEG) */}
							{settings.output.format === "jpeg" && (
								<div className="pt-4 border-t border-border mt-4">
									<div className="space-y-4">
										{/* Visually Lossless Switch */}
										{/* <div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">Visually Lossless</span>
												<span className="text-xs text-text-tertiary">
													Sets distance to 1.0 (High Quality)
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.visuallyLossless}
													onChange={(e) => onOutputChange("visuallyLossless", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div> */}

										{/* Distance Slider */}
										<div
											className={cn(
												"space-y-2 transition-opacity",
												settings.output.visuallyLossless && "opacity-50 pointer-events-none",
											)}
										>
											<div className="flex justify-between">
												<span className="text-text-primary font-medium">
													Butteraugli distance (JPG quality)
												</span>
												<span className="text-text-primary font-mono whitespace-nowrap">
													{settings.output.cjpegliDistance.toFixed(1)}
													<span className="text-text-tertiary ml-1">
														({Math.round(distanceToQuality(settings.output.cjpegliDistance))}
														%)
													</span>
												</span>
											</div>
											<input
												type="range"
												min="0.2"
												max="6.0"
												step="0.1"
												value={settings.output.cjpegliDistance}
												onChange={(e) =>
													onOutputChange("cjpegliDistance", parseFloat(e.target.value))
												}
												disabled={settings.output.visuallyLossless}
												className="w-full h-2 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-primary"
											/>
											<div className="flex justify-between text-xs text-text-tertiary">
												<span>*Visually Lossless 1.0-1.5, best file size at 2.0-3.0</span>
											</div>
										</div>

										{/* Force Subsampling 4:4:4 Switch */}
										<div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">
													Force Subsampling 4:4:4
												</span>
												<span className="text-xs text-text-tertiary">
													If off, use subsampling from source
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.forceSubsampling444}
													onChange={(e) => onOutputChange("forceSubsampling444", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div>

										{/* XYB Colorspace Switch (Temporarily Disabled) */}
										{/* <div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">XYB Colorspace</span>
												<span className="text-xs text-text-tertiary">
													Use high-efficiency perceptual colorspace (ICC v4)
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.useXyb}
													onChange={(e) => onOutputChange("useXyb", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div> */}

										{/* Progressive Mode Switch (Temporarily Disabled) */}
										{/* <div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">Progressive Mode</span>
												<span className="text-xs text-text-tertiary">
													Better loading experience for web
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.progressive}
													onChange={(e) => onOutputChange("progressive", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div> */}

										{/* Strip Metadata Switch */}
										<div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-text-primary font-medium">
													Clear EXIF and Metadata
												</span>
												<span className="text-xs text-text-tertiary">
													Remove all metadata for privacy
												</span>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={settings.output.stripMetadata}
													onChange={(e) => onOutputChange("stripMetadata", e.target.checked)}
													className="peer sr-only"
												/>
												<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
											</label>
										</div>
									</div>
								</div>
							)}

							{/* Universal Advanced Settings */}
							<div className="pt-4 border-t border-border mt-4 space-y-4">
								{/* Size Compare Switch */}
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<span className="text-text-primary font-medium">Size Compare</span>
										<span className="text-xs text-text-tertiary">Keep original if smaller</span>
									</div>
									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={settings.advanced.sizeCompare}
											onChange={(e) => onAdvancedChange("sizeCompare", e.target.checked)}
											className="peer sr-only"
										/>
										<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
									</label>
								</div>

								{/* Recompress Optimized Switch */}
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<span className="text-text-primary font-medium">Recompress Optimized</span>
										<span className="text-xs text-text-tertiary">Force reprocess</span>
									</div>
									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={settings.advanced.recompressOptimized}
											onChange={(e) => onAdvancedChange("recompressOptimized", e.target.checked)}
											className="peer sr-only"
										/>
										<div className="w-11 h-6 bg-surface-4 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
									</label>
								</div>
							</div>
						</fieldset>
					</div>
				</div>
			</div>

			{/* Reset Button */}
		</div>
	);
};
