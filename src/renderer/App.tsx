import { useEffect, useState } from "react";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProgressModal } from "./components/ProgressModal";
import { Titlebar } from "./components/Titlebar";
import { useConversion } from "./hooks/useConversion";
import { useInputItems } from "./hooks/useInputItems";
import { useProcessingSettings } from "./hooks/useProcessingSettings";
import { useUpdateNotifications } from "./hooks/useUpdateNotifications";
import { InputTab } from "./views/InputTab";
import { SettingsTab } from "./views/SettingsTab";

const App = () => {
	console.log("App component rendering...");
	const { items, addFiles, removeItem, clearItems, hasItems } = useInputItems();
	const { settings, updateOutputSetting, updateDownscaleSetting, updateAdvancedSetting } =
		useProcessingSettings();
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

	const handlePostConversion = () => {
		clearItems();
	};

	const {
		startConversion,
		cancelConversion,
		closeProgress,
		isProgressOpen,
		progress,
		result,
		statusText,
		percentage,
	} = useConversion({
		inputItems: items,
		settings,
		onSuccessfulConversion: handlePostConversion,
	});

	useUpdateNotifications();

	// Auto-select logic
	useEffect(() => {
		if (items.length > 0) {
			if (!selectedItemId || !items.find((i) => i.id === selectedItemId)) {
				setSelectedItemId(items[0].id);
			}
		} else {
			setSelectedItemId(null);
		}
	}, [items, selectedItemId]);

	const selectedItem = items.find((i) => i.id === selectedItemId);

	return (
		<div className="flex h-full flex-col font-sans bg-surface-1 text-text-primary">
			<Titlebar />

			<div className="flex flex-1 overflow-hidden">
				{/* Left Sidebar: Input & Files */}
				<aside className="flex w-80 min-w-[300px] flex-col border-r border-border bg-surface-2">
					<InputTab
						items={items}
						onAddFiles={addFiles}
						onRemove={removeItem}
						onClear={clearItems}
						hasItems={hasItems}
						processing={progress}
						selectedItemId={selectedItemId}
						onSelect={setSelectedItemId}
					/>
				</aside>

				{/* Right Content: Preview & Settings */}
				<main className="flex flex-1 flex-col min-w-0 min-h-0 bg-surface-1 relative">
					<div className="flex-1 overflow-y-auto">
						<div className="mx-auto max-w-5xl p-8 space-y-8 pb-24">
							{/* Preview Section */}
							<section>
								<h2 className="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
									<svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									Preview
								</h2>
								<PreviewPanel selectedItem={selectedItem} processing={progress} />
							</section>

							{/* Settings Section */}
							<section>
								<h2 className="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
									<svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Configuration
								</h2>
								<SettingsTab
									settings={settings}
									onOutputChange={updateOutputSetting}
									onDownscaleChange={updateDownscaleSetting}
									onAdvancedChange={updateAdvancedSetting}
								/>
							</section>
						</div>
					</div>

					{/* Sticky Action Bar */}
					<div className="border-t border-border bg-surface-2/95 backdrop-blur-sm p-4 shadow-lg z-10">
						<div className="mx-auto flex max-w-5xl items-center justify-between">
							<div className="flex flex-col">
								<span className="text-sm font-medium text-text-primary">
									{items.length} file{items.length !== 1 ? "s" : ""} ready
								</span>
								<span className="text-xs text-text-secondary">
									{items.length > 0
										? "All systems go"
										: "Add files to start"}
								</span>
							</div>
							<button
								type="button"
								onClick={startConversion}
								disabled={!hasItems}
								className="btn-primary px-8 py-3 text-base font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:transform-none disabled:shadow-none rounded-lg flex items-center gap-2"
							>
								<span>Start Conversion</span>
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</button>
						</div>
					</div>
				</main>
			</div>

			<ProgressModal
				isOpen={isProgressOpen}
				progress={progress}
				status={statusText}
				percentage={percentage}
				onCancel={cancelConversion}
				result={result}
				onClose={closeProgress}
			/>
		</div>
	);
};

export default App;
