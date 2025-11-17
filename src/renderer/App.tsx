import { useState } from "react";
import { ProgressModal } from "./components/ProgressModal";
import { TabNavigation } from "./components/TabNavigation";
import { Titlebar } from "./components/Titlebar";
import { useConversion } from "./hooks/useConversion";
import { useInputItems } from "./hooks/useInputItems";
import { useProcessingSettings } from "./hooks/useProcessingSettings";
import { useUpdateNotifications } from "./hooks/useUpdateNotifications";
import type { TabKey } from "./types";
import { AboutTab } from "./views/AboutTab";
import { InputTab } from "./views/InputTab";

import { SettingsTab } from "./views/SettingsTab";

const App = () => {
	console.log("App component rendering...");
	const [activeTab, setActiveTab] = useState<TabKey>("input");
	const { items, addFiles, removeItem, clearItems, hasItems } = useInputItems();
	const { settings, updateOutputSetting, updateDownscaleSetting, updateAdvancedSetting } =
		useProcessingSettings();
	const handlePostConversion = () => {
		clearItems();
	};

	const { startConversion, cancelConversion, isProgressOpen, progress, statusText, percentage } =
		useConversion({
			inputItems: items,
			settings,
			onSuccessfulConversion: handlePostConversion,
		});

	useUpdateNotifications();
	console.log("App component state initialized");

	const tabs = [
		{ id: "input", label: "Input" },
		{ id: "settings", label: "Settings" },
		{ id: "about", label: "About" },
	] satisfies Array<{ id: TabKey; label: string }>;

	console.log("App component rendering JSX...");
	return (
		<div className="flex h-full flex-col font-sans dark-theme bg-dark">
			<Titlebar />

			<div className="flex flex-col overflow-hidden">
				<TabNavigation tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab)} />

				<main className="flex-1 overflow-y-auto bg-dark p-4">
                    {activeTab === "input" && (
                        <InputTab
                            items={items}
                            onAddFiles={addFiles}
                            onRemove={removeItem}
                            onClear={clearItems}
                            onStartConversion={startConversion}
                            hasItems={hasItems}
                            processing={progress}
                        />
                    )}
					{activeTab === "settings" && (
						<SettingsTab
							settings={settings}
							onOutputChange={updateOutputSetting}
							onDownscaleChange={updateDownscaleSetting}
							onAdvancedChange={updateAdvancedSetting}
							onStartConversion={startConversion}
							hasItems={hasItems}
						/>
					)}
					{activeTab === "about" && <AboutTab />}
				</main>
			</div>

			<ProgressModal
				isOpen={isProgressOpen}
				progress={progress}
				status={statusText}
				percentage={percentage}
				onCancel={cancelConversion}
			/>
		</div>
	);
};

export default App;
