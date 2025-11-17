import type { TabKey } from "../types";

interface TabDefinition {
	id: TabKey;
	label: string;
}

interface TabNavigationProps {
	tabs: TabDefinition[];
	activeTab: TabKey;
	onChange: (tab: TabKey) => void;
}

export const TabNavigation = ({ tabs, activeTab, onChange }: TabNavigationProps) => (
	<nav className="flex border-b border-slate-200 bg-white px-2">
		{tabs.map((tab) => (
			<button
				key={tab.id}
				type="button"
				className={`relative cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
					activeTab === tab.id
						? "border-blue-600 text-blue-600"
						: "border-transparent text-slate-500 hover:text-slate-700"
				}`}
				onClick={() => onChange(tab.id)}
			>
				{tab.label}
			</button>
		))}
	</nav>
);
