import { useCallback, useMemo, useState } from "react";
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
import { ModifyTab } from "./views/ModifyTab";
import { OutputTab } from "./views/OutputTab";
import { SettingsTab } from "./views/SettingsTab";

const App = () => {
	const [activeTab, setActiveTab] = useState<TabKey>("input");
	const { items, addFiles, removeItem, clearItems, hasItems } = useInputItems();
	const { settings, updateOutputSetting, updateDownscaleSetting, updateAdvancedSetting } =
		useProcessingSettings();
	const handlePostConversion = useCallback(() => {
		clearItems();
	}, [clearItems]);

	const { startConversion, cancelConversion, isProgressOpen, progress, statusText, percentage } =
		useConversion({
			inputItems: items,
			settings,
			onSuccessfulConversion: handlePostConversion,
		});

	useUpdateNotifications();

	const tabs = useMemo(
		() =>
			[
				{ id: "input", label: "Input" },
				{ id: "output", label: "Output" },
				{ id: "modify", label: "Modify" },
				{ id: "settings", label: "Settings" },
				{ id: "about", label: "About" },
			] satisfies Array<{ id: TabKey; label: string }>,
		[],
	);

	return (
		<div className="flex h-full flex-col font-sans">
			<Titlebar />

			<div className="flex flex-col overflow-hidden">
				<TabNavigation tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab)} />

				<main className="flex-1 overflow-y-auto bg-slate-100">
					{activeTab === "input" && (
						<InputTab
							items={items}
							onAddFiles={addFiles}
							onRemove={removeItem}
							onClear={clearItems}
							onStartConversion={startConversion}
							hasItems={hasItems}
						/>
					)}
					{activeTab === "output" && (
						<OutputTab
							settings={settings.output}
							onChange={updateOutputSetting}
							onStartConversion={startConversion}
							hasItems={hasItems}
						/>
					)}
					{activeTab === "modify" && (
						<ModifyTab
							settings={settings}
							onDownscaleChange={updateDownscaleSetting}
							onStartConversion={startConversion}
							hasItems={hasItems}
						/>
					)}
					{activeTab === "settings" && (
						<SettingsTab settings={settings.advanced} onChange={updateAdvancedSetting} />
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
