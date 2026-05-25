import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrackTitleArtist } from '../components/music/TrackTitleArtist';
import { VirtualList } from '../components/ui/VirtualList';
import { type AuthStatus, useAuthStatus } from '../lib/auth-status';
import { listCachedUrns, removeCachedTrack } from '../lib/cache';
import { art, dur } from '../lib/formatters';
import { fetchAllLikedTracks } from '../lib/hooks';
import {
  Clock,
  Download,
  Heart,
  Music,
  Play,
  RotateCcw,
  Search,
  Trash2,
  X,
} from '../lib/icons';
import { getOfflineLikedTracks, getOfflineTracksByUrns } from '../lib/offline-index';
import { useAppStatusStore } from '../stores/app-status';
import type { Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';

interface OfflineLibraryState {
  cachedTracks: Track[];
  likedTracks: Track[];
  cachedUrns: Set<string>;
}

type OfflineSectionKey = 'likes' | 'cached';

const EMPTY_STATE: OfflineLibraryState = {
  cachedTracks: [],
  likedTracks: [],
  cachedUrns: new Set(),
};

function buildPlayableQueue(tracks: Track[], cachedUrns: Set<string>) {
  return tracks.filter((track) => cachedUrns.has(track.urn));
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function filterTracks(tracks: Track[], query: string): Track[] {
  if (!query) return tracks;
  return tracks.filter((track) => {
    const title = track.title?.toLowerCase() ?? '';
    if (title.includes(query)) return true;
    const username = track.user?.username?.toLowerCase() ?? '';
    return username.includes(query);
  });
}

const OfflineSearchBar = React.memo(function OfflineSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#ffffff99]"
        strokeWidth={1.75}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('offline.searchPlaceholder')}
        className="h-10 w-full rounded-md border border-white/10 bg-[#141414] pl-9 pr-9 text-[13px] text-white placeholder:text-[#ffffff99] outline-none transition-colors hover:border-white/20 focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        aria-label={t('offline.searchPlaceholder')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-[#0a0a0a] text-[#ffffff99] transition-colors hover:bg-white/10 hover:text-white"
          aria-label="clear"
        >
          <X size={12} strokeWidth={2} />
        </button>
      )}
    </div>
  );
});

const StatusBadge = React.memo(function StatusBadge() {
  const { t } = useTranslation();
  const mode = useAppStatusStore((s) =>
    s.offlineBypass || !s.navigatorOnline || !s.backendReachable ? 'offline' : 'online',
  );

  const online = mode === 'online';

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-2.5 py-1 text-[11px] font-medium text-[#ffffff99]">
      <span
        className={`size-1.5 rounded-full ${online ? 'bg-accent' : 'bg-white/30'}`}
      />
      {online ? t('offline.readyBadge') : t('offline.offlineBadge')}
    </span>
  );
});

const SyncBadge = React.memo(function SyncBadge({ status }: { status: AuthStatus | undefined }) {
  const { t } = useTranslation();
  const pending = status?.pendingSyncCount ?? 0;
  const failed = status?.failedSyncCount ?? 0;
  if (pending === 0 && failed === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#141414] px-2.5 py-1 text-[11px] font-medium text-[#ffffff99]">
      <Clock size={11} />
      {t('offline.pendingCount', { count: pending })}
      {failed > 0 && (
        <span className="text-red-400/80">({t('offline.failedCount', { count: failed })})</span>
      )}
    </span>
  );
});

const OfflineTrackRow = React.memo(function OfflineTrackRow({
  track,
  queue,
  canPlay,
  showCachedBadge,
  onRemove,
}: {
  track: Track;
  queue: Track[];
  canPlay: boolean;
  showCachedBadge: boolean;
  onRemove?: (urn: string) => void;
}) {
  const { t } = useTranslation();
  const play = usePlayerStore((s) => s.play);
  const artwork = art(track.artwork_url, 't200x200');

  return (
    <div
      className="group flex cursor-pointer items-center gap-2.5 rounded-md border border-white/10 bg-white/[.03] px-3 py-2.5 transition-colors hover:bg-white/5"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '56px' }}
      onClick={() => canPlay && play(track, queue)}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#141414]">
        {artwork ? (
          <img src={artwork} alt="" className="size-full object-cover" decoding="async" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-[#ffffff99]">
            <Music size={16} />
          </div>
        )}
        {canPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Play size={14} fill="white" strokeWidth={0} />
          </div>
        )}
      </div>

      <TrackTitleArtist track={track} size="md" className="min-w-0 flex-1" />

      <span
        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${
          showCachedBadge
            ? 'bg-accent/15 text-accent'
            : 'bg-white/5 text-[#ffffff99]'
        }`}
      >
        {showCachedBadge ? t('offline.cached') : t('offline.notCached')}
      </span>

      <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-[#ffffff99]">
        {dur(track.duration)}
      </span>

      {onRemove && showCachedBadge && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(track.urn);
          }}
          title={t('offline.removeCached')}
          aria-label={t('offline.removeCached')}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-[#141414] text-[#ffffff99] opacity-0 transition-colors hover:bg-white/10 hover:text-white group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
});

const OverviewMetric = React.memo(function OverviewMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.03] px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414] text-[#ffffff99]">
          {icon}
        </div>
        <span className="text-[11px] font-medium text-[#ffffff99]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
});

const SectionSwitchCard = React.memo(function SectionSwitchCard({
  active,
  count,
  icon,
  onClick,
  title,
}: {
  active: boolean;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-state={active ? 'checked' : 'unchecked'}
      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[.03] p-3 text-left transition-colors hover:bg-white/5 data-[state=checked]:border-accent/40 data-[state=checked]:bg-accent/10"
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-4 shrink-0 rounded-full border border-white/15 transition-[border] group-data-[state=checked]:border-4 group-data-[state=checked]:border-accent" />
        <span className="truncate text-sm font-medium text-white">{title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            active ? 'bg-accent/15 text-accent' : 'bg-white/5 text-[#ffffff99]'
          }`}
        >
          {count}
        </span>
        <span className="text-[#ffffff99]">{icon}</span>
      </div>
    </button>
  );
});

function OfflineSection({
  title,
  items,
  cachedUrns,
  emptyText,
  likesMode = false,
  onRemoveCached,
}: {
  title: string;
  items: Track[];
  cachedUrns: Set<string>;
  emptyText: string;
  likesMode?: boolean;
  onRemoveCached?: (urn: string) => void;
}) {
  const playableQueue = useMemo(() => buildPlayableQueue(items, cachedUrns), [items, cachedUrns]);

  return (
    <section className="rounded-lg border border-white/10 bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-[#ffffff99]">
          {items.length}
        </span>
      </div>

      <div className="px-5 py-4">
        {items.length > 0 ? (
          <VirtualList
            items={items}
            rowHeight={56}
            overscan={8}
            getItemKey={(track) => track.urn}
            renderItem={(track) => {
              const isCached = cachedUrns.has(track.urn);
              return (
                <OfflineTrackRow
                  track={track}
                  queue={likesMode ? playableQueue : items}
                  canPlay={likesMode ? isCached : true}
                  showCachedBadge={isCached}
                  onRemove={onRemoveCached}
                />
              );
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-white/10 bg-[#141414] py-8">
            <span className="text-sm font-medium text-white/80">{emptyText}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export const OfflinePage = React.memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const appMode = useAppStatusStore((s) =>
    s.offlineBypass || !s.navigatorOnline || !s.backendReachable ? 'offline' : 'online',
  );
  const [state, setState] = useState<OfflineLibraryState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<OfflineSectionKey>('likes');
  const [search, setSearch] = useState('');
  const bgFetchDone = useRef(false);
  const authStatus = useAuthStatus({ enabled: appMode === 'online' });

  const handleRemoveCached = React.useCallback(async (urn: string) => {
    try {
      await removeCachedTrack(urn);
    } catch (error) {
      console.warn('[Offline] Failed to remove cached track:', error);
      return;
    }
    setState((prev) => {
      if (!prev.cachedUrns.has(urn)) return prev;
      const cachedUrns = new Set(prev.cachedUrns);
      cachedUrns.delete(urn);
      return {
        ...prev,
        cachedUrns,
        cachedTracks: prev.cachedTracks.filter((track) => track.urn !== urn),
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOffline = async () => {
      try {
        const [likedTracks, cachedUrns] = await Promise.all([
          getOfflineLikedTracks(),
          listCachedUrns(),
        ]);
        const cachedSet = new Set(cachedUrns);
        const cachedTracks = await getOfflineTracksByUrns(cachedUrns);
        if (cancelled) return;

        setState({ likedTracks, cachedTracks, cachedUrns: cachedSet });
      } catch (error) {
        console.warn('[Offline] Failed to load local cache:', error);
        if (cancelled) return;
        setState(EMPTY_STATE);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOffline();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (appMode !== 'online' || bgFetchDone.current) {
      return;
    }

    let cancelled = false;

    const syncAllLikes = async () => {
      try {
        const allLikes = await fetchAllLikedTracks();
        bgFetchDone.current = true;
        if (cancelled) return;

        const cachedUrns = await listCachedUrns();
        const cachedSet = new Set(cachedUrns);
        const cachedTracks = await getOfflineTracksByUrns(cachedUrns);
        if (cancelled) return;

        setState({ likedTracks: allLikes, cachedTracks, cachedUrns: cachedSet });
      } catch {
      }
    };

    void syncAllLikes();

    return () => {
      cancelled = true;
    };
  }, [appMode]);

  useEffect(() => {
    if (
      activeSection === 'likes' &&
      state.likedTracks.length === 0 &&
      state.cachedTracks.length > 0
    ) {
      setActiveSection('cached');
    }

    if (
      activeSection === 'cached' &&
      state.cachedTracks.length === 0 &&
      state.likedTracks.length > 0
    ) {
      setActiveSection('likes');
    }
  }, [activeSection, state.cachedTracks.length, state.likedTracks.length]);

  const cachedLikesCount = useMemo(
    () => state.likedTracks.filter((track) => state.cachedUrns.has(track.urn)).length,
    [state.cachedUrns, state.likedTracks],
  );

  const normalizedQuery = useMemo(() => normalizeQuery(search), [search]);
  const filteredLikes = useMemo(
    () => filterTracks(state.likedTracks, normalizedQuery),
    [state.likedTracks, normalizedQuery],
  );
  const filteredCached = useMemo(
    () => filterTracks(state.cachedTracks, normalizedQuery),
    [state.cachedTracks, normalizedQuery],
  );

  const statusTitle = useMemo(() => {
    if (appMode === 'offline') return t('offline.offlineTitle');
    return t('offline.readyTitle');
  }, [appMode, t]);

  return (
    <div className="min-h-full bg-[#0a0a0a] px-5 py-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <StatusBadge />
              <h1 className="mt-3 text-2xl font-medium tracking-tight text-white sm:text-3xl">
                {statusTitle}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SyncBadge status={authStatus.data} />
              <button
                type="button"
                onClick={() => {
                  useAppStatusStore.getState().resetConnectivity();
                  navigate('/home');
                }}
                className="btn-secondary"
              >
                <RotateCcw size={14} />
                {t('offline.tryOnline')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <OverviewMetric
              icon={<Heart size={16} />}
              label={t('offline.statsLikes')}
              value={state.likedTracks.length}
            />
            <OverviewMetric
              icon={<Download size={16} />}
              label={t('offline.statsPlayableLikes')}
              value={cachedLikesCount}
            />
            <OverviewMetric
              icon={<Download size={16} />}
              label={t('offline.statsCached')}
              value={state.cachedTracks.length}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-14 animate-pulse rounded-lg border border-white/10 bg-[#141414]" />
            <div className="h-14 animate-pulse rounded-lg border border-white/10 bg-[#141414]" />
            <div className="h-64 animate-pulse rounded-lg border border-white/10 bg-[#141414]" />
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <SectionSwitchCard
                active={activeSection === 'likes'}
                count={state.likedTracks.length}
                icon={<Heart size={16} className="text-[#ffffff99]" />}
                onClick={() => setActiveSection('likes')}
                title={t('offline.likesTitle')}
              />
              <SectionSwitchCard
                active={activeSection === 'cached'}
                count={state.cachedTracks.length}
                icon={<Download size={16} className="text-[#ffffff99]" />}
                onClick={() => setActiveSection('cached')}
                title={t('offline.cachedTitle')}
              />
            </div>

            <OfflineSearchBar value={search} onChange={setSearch} />

            {activeSection === 'likes' ? (
              <OfflineSection
                title={t('offline.likesTitle')}
                items={filteredLikes}
                cachedUrns={state.cachedUrns}
                emptyText={normalizedQuery ? t('offline.searchEmpty') : t('offline.likesEmpty')}
                likesMode
                onRemoveCached={handleRemoveCached}
              />
            ) : (
              <OfflineSection
                title={t('offline.cachedTitle')}
                items={filteredCached}
                cachedUrns={state.cachedUrns}
                emptyText={normalizedQuery ? t('offline.searchEmpty') : t('offline.cachedEmpty')}
                onRemoveCached={handleRemoveCached}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});
