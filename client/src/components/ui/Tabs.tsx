import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
  badge?: number;
}

export function Tabs({ tabs, initialId }: { tabs: TabDef[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTab?.id}
            className={`tabs__tab ${tab.id === activeTab?.id ? "tabs__tab--active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
            {typeof tab.badge === "number" && tab.badge > 0 && <span className="tabs__badge">{tab.badge}</span>}
          </button>
        ))}
      </div>
      <div className="tabs__panel">{activeTab?.content}</div>
    </div>
  );
}
