import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlbumsCatalog } from '../components/discover/AlbumsCatalog';
import { ArtistsCatalog } from '../components/discover/ArtistsCatalog';
import { DiscoverHero } from '../components/discover/DiscoverHero';
import { DiscoverSpotlight } from '../components/discover/DiscoverSpotlight';
import { useDebouncedValue } from '../components/discover/useDebouncedValue';
import { AuraField } from '../components/user/AuraField';
import { USER_PAGE_KEYFRAMES } from '../components/user/keyframes';
import { type TabDescriptor, TabDock } from '../components/user/TabDock';
import { DEFAULT_AURA } from '../lib/aura';
import { fetchDiscoverRandom, useDiscoverSummary } from '../lib/discover';
import { Search, X } from '../lib/icons';

type DiscoverTabId = 'albums' | 'artists';

const SEARCH_DEBOUNCE_MS = 220;

export const Discover = memo(function Discover() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DiscoverTabId>('albums');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [isSurprising, setIsSurprising] = useState(false);

  const aura = DEFAULT_AURA;

  const summaryQuery = useDiscoverSummary();
  const summary = summaryQuery.data;

  const tabs = useMemo<ReadonlyArray<TabDescriptor<DiscoverTabId>>>(
    () => [
      { id: 'albums', label: t('discover.tabAlbums'), count: summary?.albums_count },
      { id: 'artists', label: t('discover.tabArtists'), count: summary?.artists_count },
    ],
    [t, summary?.albums_count, summary?.artists_count],
  );

  const onSurprise = useCallback(async () => {
    if (isSurprising) return;
    setIsSurprising(true);
    try {
      const kind = tab === 'albums' ? 'album' : 'artist';
      const id = await fetchDiscoverRandom(kind);
      if (id) {
        const path = kind === 'album' ? '/album/' : '/artist/';
        navigate(`${path}${encodeURIComponent(id)}`);
      }
    } finally {
      setIsSurprising(false);
    }
  }, [isSurprising, navigate, tab]);

  return (
    <>
      <style>{USER_PAGE_KEYFRAMES}</style>
      <div className="relative w-full min-h-screen">
        <AuraField aura={aura} isStar={false} />

        <div
          className="relative z-10 w-full max-w-[1480px] mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-32 flex flex-col gap-10"
          style={{ isolation: 'isolate' }}
        >
          <DiscoverHero
            aura={aura}
            artistsCount={summary?.artists_count ?? null}
            albumsCount={summary?.albums_count ?? null}
            freshCount={summary?.fresh_count ?? null}
            isLoading={summaryQuery.isLoading}
            onSurpriseMe={onSurprise}
            isSurprising={isSurprising}
          />

          <DiscoverSpotlight aura={aura} />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <TabDock<DiscoverTabId> tabs={tabs} active={tab} onChange={setTab} aura={aura} />
              <SearchInput value={query} onChange={setQuery} />
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0a0a0a] p-3 md:px-4 py-3">
              {tab === 'albums' ? (
                <AlbumsCatalog aura={aura} query={debouncedQuery} />
              ) : (
                <ArtistsCatalog aura={aura} query={debouncedQuery} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

const SearchInput = memo(function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full max-w-[320px]">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search size={15} className="text-[#ffffff99]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('discover.searchPlaceholder')}
        className="w-full bg-[#141414] border border-white/10 rounded-md text-[13px] text-white placeholder:text-[#ffffff99] py-2 pl-9 pr-8 outline-none focus:border-white/30 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-2 flex items-center text-[#ffffff99] hover:text-[#ffffff99] cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});
