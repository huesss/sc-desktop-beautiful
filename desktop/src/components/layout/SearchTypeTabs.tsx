import React from 'react';

export type SearchTypeTab = 'tracks' | 'playlists' | 'users';

interface SearchTypeTabsProps {
  tabs: ReadonlyArray<{ id: SearchTypeTab; label: string }>;
  activeTab: SearchTypeTab;
  onTabChange: (tab: SearchTypeTab) => void;
  className?: string;
}

export const SearchTypeTabs = React.memo(function SearchTypeTabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: SearchTypeTabsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              isActive
                ? 'bg-white text-black'
                : 'bg-[#ffffff18] text-white hover:bg-[#ffffff28]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});
