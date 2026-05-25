import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X } from '../../../lib/icons';

const IconChip = React.memo(function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-6 h-6 rounded-lg flex items-center justify-center"
      style={{
        background: '#141414', border: '1px solid var(--color-accent-glow)',
      }}
    >
      {children}
    </div>
  );
});

interface SearchHeaderProps {
  query: string;
  count: number;
  onClear: () => void;
}


export const SearchHeader = React.memo(function SearchHeader({
  query,
  count,
  onClear,
}: SearchHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 mb-3 px-1">
      <IconChip>
        <Sparkles size={11} style={{ color: 'var(--color-accent)' }} />
      </IconChip>
      <span className="text-[12px] font-semibold text-[#ffffff99]">
        {t('soundwave.searchResultsFor', { q: query })}
      </span>
      {count > 0 && (
        <span className="text-[10.5px] tabular-nums text-[#ffffff99] font-medium">
          · {t('soundwave.searchResultsCount', { count })}
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-[10.5px] text-[#ffffff99] hover:text-[#ffffff99] transition-colors cursor-pointer"
      >
        <X size={10} />
        {t('soundwave.searchReset')}
      </button>
    </div>
  );
});
