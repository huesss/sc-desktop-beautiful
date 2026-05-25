import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AudioLines,
  Compass,
  Disc3,
  Headphones,
  playBlack14,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from '../../../lib/icons';
import { isUrnLiked } from '../../../lib/likes';
import { fetchWaveTailFromSeed, hydrateByIds, useSoundWaveSearch } from '../../../lib/soundwave';
import { useAuthStore } from '../../../stores/auth';
import type { Track } from '../../../stores/player';
import { usePlayerStore } from '../../../stores/player';
import { useSettingsStore } from '../../../stores/settings';
import {
  ClusterEmptyState,
  type ClusterHydrated,
  type ClusterId,
  ClusterRow,
  ClusterSkeletonState,
  NeighborsRow,
  useClusterWave,
} from '../cluster';
import { SearchHeader } from './headers';
import { HideLikedToggle } from './hide-liked-toggle';
import { LanguageFilter } from './language-filter';
import { RecommendationsStrip } from './strip';
import { WaveTrackHeader } from './track-header';
import { useInfiniteWave } from './use-infinite-wave';
import { VibeSearchBar, type VibeSearchBarHandle } from './vibe-search-bar';
import { LiveWaveform } from './waveform';

const CLUSTER_ORDER: ClusterId[] = [
  'for_you',
  'top_artists',
  'adjacent',
  'fresh_drops',
  'same_vibe',
  'deep_cuts',
];

const CLUSTER_ICON: Partial<Record<ClusterId, React.ReactNode>> = {
  for_you: <Sparkles size={14} />,
  top_artists: <Headphones size={14} />,
  adjacent: <Compass size={14} />,
  fresh_drops: <Disc3 size={14} />,
  same_vibe: <AudioLines size={14} />,
  deep_cuts: <Star size={14} />,
};

const WAVE_ICON = <AudioLines size={14} />;

export const SoundWaveBlock = React.memo(function SoundWaveBlock() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedLanguages = useSettingsStore((s) => s.soundwaveLanguages);
  const setSelectedLanguages = useSettingsStore((s) => s.setSoundwaveLanguages);
  const hideLiked = useSettingsStore((s) => s.soundwaveHideLiked);
  const setHideLiked = useSettingsStore((s) => s.setSoundwaveHideLiked);

  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const searchRef = useRef<VibeSearchBarHandle>(null);

  const stableLanguages = useMemo(() => [...selectedLanguages].sort(), [selectedLanguages]);
  const langKey = stableLanguages.join(',') || 'all';

  const url = useMemo(() => {
    if (!isAuthenticated) return null;
    const qs = new URLSearchParams();
    if (stableLanguages.length > 0) qs.set('languages', stableLanguages.join(','));
    const suffix = qs.toString() ? `?${qs}` : '';
    return `/recommendations${suffix}`;
  }, [isAuthenticated, stableLanguages]);

  const { data, isLoading, isFetching, refetch } = useClusterWave({
    queryKey: ['cluster-wave', 'home', langKey],
    url,
    enabled: isAuthenticated,
  });

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useSoundWaveSearch({ q: activeQuery, languages: stableLanguages });

  const rawClusters = useMemo(() => data?.clusters ?? [], [data]);
  const rawAllTracks = useMemo(() => data?.allTracks ?? [], [data]);

  const filteredAllTracks = useMemo(() => {
    if (!hideLiked) return rawAllTracks;
    return rawAllTracks.filter((tr) => !tr.user_favorite && !isUrnLiked(tr.urn));
  }, [rawAllTracks, hideLiked]);

  const filteredClusters = useMemo(() => {
    if (!hideLiked) return rawClusters;
    return rawClusters
      .map((c) => ({
        ...c,
        tracks: c.tracks.filter((tr) => !tr.user_favorite && !isUrnLiked(tr.urn)),
        neighbors: c.neighbors?.filter((n) => {
          const matchTrack = c.tracks.find((tr) => tr.urn.endsWith(`:${n.track_id}`));
          if (!matchTrack) return true;
          return !matchTrack.user_favorite && !isUrnLiked(matchTrack.urn);
        }),
      }))
      .filter((c) => c.tracks.length > 0) as ClusterHydrated[];
  }, [rawClusters, hideLiked]);

  const orderedClusters = useMemo(() => {
    const byId = new Map(filteredClusters.map((c) => [c.id, c]));
    return CLUSTER_ORDER.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  }, [filteredClusters]);

  const searchTracks = useMemo(() => searchData?.tracks ?? [], [searchData]);
  const isSearchMode = activeQuery.length >= 2;
  const searchBusy = searchLoading || searchFetching;

  const waveTrack = currentTrack ?? filteredAllTracks[0] ?? null;
  const isCurrent = !!currentTrack && waveTrack?.urn === currentTrack.urn;

  const fetchMore = useCallback(
    async () => fetchTail(stableLanguages, hideLiked),
    [stableLanguages, hideLiked],
  );

  useInfiniteWave({
    enabled: isAuthenticated && !isSearchMode,
    tracks: filteredAllTracks,
    fetchMore,
  });

  const handleSubmitSearch = useCallback((q: string) => setActiveQuery(q), []);
  const handleClearSearch = useCallback(() => {
    searchRef.current?.clear();
    setActiveQuery('');
  }, []);

  if (!isAuthenticated) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const handlePlayAll = () => {
    if (!filteredAllTracks.length) return;
    usePlayerStore.getState().play(filteredAllTracks[0], filteredAllTracks);
  };

  const spinning = isRefreshing || isFetching;
  const showCold = !isSearchMode && !isLoading && orderedClusters.length === 0;
  const showSearchEmpty = isSearchMode && !searchBusy && searchTracks.length === 0;
  const playableTracks = isSearchMode ? searchTracks : filteredAllTracks;

  return (
    <section className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] select-none">
      <div className="relative px-4 py-3 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-md border border-white/10 bg-[#141414] flex items-center justify-center shrink-0">
              <AudioLines size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="soundwave-title text-[20px] font-bold tracking-tight leading-none">
                  SoundWave
                </h2>
                <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md text-[#ffffff99] bg-[#141414] border border-white/10">
                  <Sparkles size={9} className="text-accent" />
                  AI
                </span>
              </div>
              <p className="text-[11.5px] text-[#ffffff99] mt-1 truncate">{t('soundwave.tagline')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <HideLikedToggle value={hideLiked} onChange={setHideLiked} />
            <LanguageFilter selected={selectedLanguages} onChange={setSelectedLanguages} />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={spinning}
              className="flex items-center justify-center w-8 h-8 rounded-md bg-white/[.03] border border-white/10 hover:bg-[#141414] transition-colors text-[#ffffff99] hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('soundwave.refresh')}
            >
              <RefreshCw size={13} className={spinning ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={handlePlayAll}
              disabled={playableTracks.length === 0}
              className="btn-primary flex items-center gap-2 pl-2.5 pr-4 h-9 rounded-md font-medium text-[13px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('soundwave.playAll')}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                {playBlack14}
              </span>
              {t('soundwave.playAll')}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {waveTrack ? (
            <WaveTrackHeader
              track={waveTrack}
              queue={playableTracks.length ? playableTracks : [waveTrack]}
              isCurrent={isCurrent}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-md bg-[#141414] border border-white/10 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white leading-tight">
                  {t('soundwave.idleTitle')}
                </p>
                <p className="text-[12px] text-[#ffffff99] mt-0.5 truncate">
                  {t('soundwave.idleSub')}
                </p>
              </div>
            </div>
          )}

          <LiveWaveform track={waveTrack} isCurrent={isCurrent} />
        </div>

        <VibeSearchBar
          ref={searchRef}
          onSubmit={handleSubmitSearch}
          onClear={handleClearSearch}
          loading={searchBusy}
          active={isSearchMode}
        />

        <div className="min-h-[280px]">
          {isSearchMode ? (
            <SearchSection
              query={activeQuery}
              count={searchTracks.length}
              tracks={searchTracks}
              busy={searchBusy}
              empty={showSearchEmpty}
              onClear={handleClearSearch}
            />
          ) : isLoading ? (
            <ClusterSkeletonState rows={3} itemsPerRow={6} />
          ) : showCold ? (
            <ClusterEmptyState
              icon={<Sparkles size={20} style={{ color: 'var(--color-accent)' }} />}
              title={t('soundwave.coldTitle')}
              description={t('soundwave.coldDesc')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAllTracks.length > 0 && (
                <ClusterRow
                  clusterId="wave"
                  title={t('soundwave.home.waveTitle')}
                  description={t('soundwave.home.waveDesc')}
                  icon={WAVE_ICON}
                  index={0}
                  tracks={filteredAllTracks}
                  queue={filteredAllTracks}
                />
              )}
              {orderedClusters.map((c, idx) =>
                (c.id === 'top_artists' || c.id === 'adjacent') && c.neighbors ? (
                  <NeighborsRow
                    key={c.id}
                    title={t(`soundwave.home.cluster.${c.id}`)}
                    description={t(`soundwave.home.cluster.${c.id}Desc`)}
                    icon={CLUSTER_ICON[c.id]}
                    index={idx + 1}
                    cluster={c}
                    queue={filteredAllTracks}
                  />
                ) : (
                  <ClusterRow
                    key={c.id}
                    clusterId={c.id}
                    title={t(`soundwave.home.cluster.${c.id}`)}
                    description={t(`soundwave.home.cluster.${c.id}Desc`)}
                    icon={CLUSTER_ICON[c.id]}
                    index={idx + 1}
                    tracks={c.tracks}
                    queue={filteredAllTracks}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

interface SearchSectionProps {
  query: string;
  count: number;
  tracks: Track[];
  busy: boolean;
  empty: boolean;
  onClear: () => void;
}

const SearchSection = React.memo(function SearchSection({
  query,
  count,
  tracks,
  busy,
  empty,
  onClear,
}: SearchSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <SearchHeader query={query} count={count} onClear={onClear} />
      {busy ? (
        <ClusterSkeletonState rows={1} itemsPerRow={6} />
      ) : empty ? (
        <ClusterEmptyState
          icon={<Search size={18} style={{ color: 'var(--color-accent)' }} />}
          title={t('soundwave.searchEmptyTitle')}
          description={t('soundwave.searchEmptyDesc')}
        />
      ) : (
        <RecommendationsStrip tracks={tracks} />
      )}
    </div>
  );
});

async function fetchTail(languages: string[], hideLiked: boolean): Promise<Track[]> {
  const q = usePlayerStore.getState().queue;
  const last = q.length > 0 ? q[q.length - 1] : null;
  if (!last) return [];
  const trackId = String(last.urn.split(':').pop() ?? '');
  if (!trackId) return [];
  const recs = await fetchWaveTailFromSeed(trackId, { languages, mode: 'similar' });
  if (!recs.length) return [];
  const tracks = await hydrateByIds(recs);
  return hideLiked ? tracks.filter((tr) => !tr.user_favorite && !isUrnLiked(tr.urn)) : tracks;
}
