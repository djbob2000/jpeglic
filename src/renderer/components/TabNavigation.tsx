import { cn } from "../utils/cn";
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

export const TabNavigation = ({
  tabs,
  activeTab,
  onChange,
}: TabNavigationProps) => (
  <nav className="flex border-b border-gray-700 bg-gray-900 px-2">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={cn(
          "nav-tab relative cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none",
          activeTab === tab.id && "active"
        )}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);
