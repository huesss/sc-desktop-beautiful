import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlaylistCard } from '../components/music/PlaylistCard';
import { VirtualGrid } from '../components/ui/VirtualGrid';
import { VirtualList } from '../components/ui/VirtualList';
import { api } from '../lib/api';
import { art, fc } from '../lib/formatters';
import {
  type HistoryEntry,
  type SCUser,
  useHistory,
  useInfiniteScroll,
  useMyFollowings,
  useMyLikedPlaylists,
  useMyPlaylists,
} from '../lib/hooks';
import {
  Loader2,
  Music,
  playWhite14,
  Search as SearchIcon,
  User,
  Users,
  X,
} from '../lib/icons';
import { markPlaylistDead } from '../lib/playlist-dead-registry';
import { useVerifiedPlaylists } from '../lib/playlist-verify';
import { useAuthStore } from '../stores/auth';
import type { Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';

const UserCard = React.memo(({ user }: { user: SCUser }) => {
  const navigate = useNavigate();
  const avatar = art(user.avatar_url, 't300x300');

  return (
    <div
      className="group flex flex-col items-center gap-2 p-4 rounded-lg bg-[#0a0a0a] hover:bg-[#141414] border border-white/10 transition-colors cursor-pointer"
      onClick={() => navigate(`/user/${encodeURIComponent(user.urn)}`)}
    >
      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/10">
        {avatar ? (
          <img
            src={avatar}
            alt={user.username}
            className="w-full h-full object-cover"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <User size={32} className="text-white/20" />
          </div>
        )}
      </div>

      <div className="text-center w-full">
        <p className="text-[15px] font-bold text-white truncate group-hover:text-white transition-colors">
          {user.username}
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-[#ffffff99] font-medium">
          <span className="uppercase tracking-wider flex items-center gap-1">
            <Users size={10} />
            {fc(user.followers_count)}
          </span>
        </div>
      </div>
    </div>
  );
});



const LibraryHero = React.memo(function LibraryHero({ onTabFollowing }: { onTabFollowing: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { users: followings } = useMyFollowings();

  if (!user) return null;

  return (
    <section className="max-w-xl">
      <div
        className="relative h-[200px] rounded-lg overflow-hidden p-6 flex flex-col justify-between group cursor-pointer border border-white/10 bg-[#0a0a0a] hover:bg-[#141414] transition-colors"
        onClick={onTabFollowing}
      >
        <div>
          <div className="w-10 h-10 rounded-md bg-[#141414] border border-white/10 flex items-center justify-center mb-3">
            <Users size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">{t('nav.following')}</h2>
          <p className="text-[13px] text-[#ffffff99] mt-1">
            {fc(user.followings_count)} {t('search.users').toLowerCase()}
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex -space-x-3 overflow-hidden py-1 pl-1">
            {followings.slice(0, 7).map((u) => (
              <div
                key={u.id}
                className="w-11 h-11 rounded-full border-2 border-[#0a0a0a] bg-[#141414] overflow-hidden"
              >
                <img
                  src={art(u.avatar_url, 'small') || ''}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

const FollowingTab = React.memo(function FollowingTab({ filter }: { filter: string }) {
  const { t } = useTranslation();
  const followingsQuery = useMyFollowings();
  const { users: followings, isLoading } = followingsQuery;
  const sentinelRef = useInfiniteScroll(
    !!followingsQuery.hasNextPage,
    !!followingsQuery.isFetchingNextPage,
    followingsQuery.fetchNextPage,
  );

  useEffect(() => {
    if (filter && followingsQuery.hasNextPage && !followingsQuery.isFetchingNextPage) {
      followingsQuery.fetchNextPage();
    }
  }, [filter, followingsQuery.hasNextPage, followingsQuery.isFetchingNextPage]);

  const filtered = useMemo(() => {
    if (!filter) return followings;
    const q = filter.toLowerCase();
    return followings.filter((u) => u.username.toLowerCase().includes(q));
  }, [followings, filter]);

  return (
    <div className="min-h-[400px]">
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-white/20" />
        </div>
      ) : filtered.length > 0 ? (
        <VirtualGrid
          items={filtered}
          itemHeight={220}
          minColumnWidth={160}
          gap={16}
          overscan={3}
          disabled={filtered.length < 30}
          getItemKey={(user) => user.urn}
          renderItem={(user) => <UserCard user={user} />}
        />
      ) : (
        <div className="py-20 text-center text-white/20">
          {filter ? t('library.noMatches') : t('library.notFollowing')}
        </div>
      )}
      {!filter && (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
          {followingsQuery.isFetchingNextPage && (
            <Loader2 size={20} className="text-white/15 animate-spin" />
          )}
        </div>
      )}
    </div>
  );
});

const PlaylistsTab = React.memo(function PlaylistsTab({ filter }: { filter: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const myPlaylistsQuery = useMyPlaylists();
  const likedPlaylistsQuery = useMyLikedPlaylists();
  const listsReady = !myPlaylistsQuery.isLoading && !likedPlaylistsQuery.isLoading;
  const { playlists: verifiedCreated, verifying: verifyingCreated } = useVerifiedPlaylists(
    myPlaylistsQuery.playlists,
    listsReady,
  );
  const { playlists: verifiedLiked, verifying: verifyingLiked } = useVerifiedPlaylists(
    likedPlaylistsQuery.playlists,
    listsReady,
  );
  const [hiddenUrns, setHiddenUrns] = useState<Set<string>>(() => new Set());

  const hidePlaylist = useCallback(
    (urn: string) => {
      markPlaylistDead(urn, qc);
      setHiddenUrns((prev) => {
        if (prev.has(urn)) return prev;
        const next = new Set(prev);
        next.add(urn);
        return next;
      });
    },
    [qc],
  );

  const filteredCreated = useMemo(() => {
    const visible = verifiedCreated.filter((p) => !hiddenUrns.has(p.urn));
    if (!filter) return visible;
    const q = filter.toLowerCase();
    return visible.filter((p) => p.title.toLowerCase().includes(q));
  }, [verifiedCreated, hiddenUrns, filter]);

  const filteredLiked = useMemo(() => {
    const visible = verifiedLiked.filter((p) => !hiddenUrns.has(p.urn));
    if (!filter) return visible;
    const q = filter.toLowerCase();
    return visible.filter((p) => p.title.toLowerCase().includes(q));
  }, [verifiedLiked, hiddenUrns, filter]);

  const verifying = listsReady && (verifyingCreated || verifyingLiked);

  const hasNextPage = likedPlaylistsQuery.hasNextPage || myPlaylistsQuery.hasNextPage;
  const isFetchingNextPage =
    likedPlaylistsQuery.isFetchingNextPage || myPlaylistsQuery.isFetchingNextPage;
  const fetchNextPage = likedPlaylistsQuery.hasNextPage
    ? likedPlaylistsQuery.fetchNextPage
    : myPlaylistsQuery.fetchNextPage;
  const sentinelRef = useInfiniteScroll(!!hasNextPage, !!isFetchingNextPage, fetchNextPage);

  
  useEffect(() => {
    if (filter && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [filter, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-[400px]">
      <div className="space-y-10">
        {myPlaylistsQuery.isLoading || (verifying && filteredCreated.length === 0) ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-white/20" />
          </div>
        ) : filteredCreated.length > 0 ? (
          <section>
            <h3 className="text-lg font-bold text-[#ffffff99] mb-5 px-1">
              {t('library.yourPlaylists')}
            </h3>
            <VirtualGrid
              items={filteredCreated}
              itemHeight={320}
              minColumnWidth={180}
              gap={24}
              overscan={3}
              disabled={filteredCreated.length < 30}
              getItemKey={(playlist) => playlist.urn}
              renderItem={(playlist) => (
                <PlaylistCard
                  playlist={playlist}
                  onUnavailable={() => hidePlaylist(playlist.urn)}
                />
              )}
            />
          </section>
        ) : null}

        {likedPlaylistsQuery.isLoading || (verifying && filteredLiked.length === 0) ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-white/20" />
          </div>
        ) : filteredLiked.length > 0 ? (
          <section>
            <h3 className="text-lg font-bold text-[#ffffff99] mb-5 px-1">
              {t('library.likedPlaylists')}
            </h3>
            <VirtualGrid
              items={filteredLiked}
              itemHeight={320}
              minColumnWidth={180}
              gap={24}
              overscan={3}
              disabled={filteredLiked.length < 30}
              getItemKey={(playlist) => playlist.urn}
              renderItem={(playlist) => (
                <PlaylistCard
                  playlist={playlist}
                  onUnavailable={() => hidePlaylist(playlist.urn)}
                />
              )}
            />
          </section>
        ) : null}

        {!myPlaylistsQuery.isLoading &&
          !likedPlaylistsQuery.isLoading &&
          !verifying &&
          filteredCreated.length === 0 &&
          filteredLiked.length === 0 && (
            <div className="py-20 text-center text-white/20">
              {filter ? t('library.noMatches') : t('library.noPlaylists')}
            </div>
          )}
      </div>
      {!filter && (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
          {isFetchingNextPage && <Loader2 size={20} className="text-white/15 animate-spin" />}
        </div>
      )}
    </div>
  );
});



function formatHistoryDate(dateStr: string, t: (k: string) => string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  if (d >= today) return t('library.today');
  if (d >= yesterday) return t('library.yesterday');
  return t('library.earlier');
}

function historyEntryToTrack(entry: HistoryEntry): Track {
  return {
    id: 0,
    urn: entry.scTrackId,
    title: entry.title,
    duration: entry.duration,
    artwork_url: entry.artworkUrl,
    user: {
      id: 0,
      urn: entry.artistUrn || '',
      username: entry.artistName,
      avatar_url: '',
      permalink_url: '',
    },
  };
}

const HistoryTab = React.memo(function HistoryTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const historyQuery = useHistory();
  const { entries, isLoading } = historyQuery;
  const sentinelRef = useInfiniteScroll(
    !!historyQuery.hasNextPage,
    !!historyQuery.isFetchingNextPage,
    historyQuery.fetchNextPage,
  );

  const handleClearHistory = useCallback(async () => {
    await api('/history', { method: 'DELETE' });
    historyQuery.refetch();
  }, [historyQuery]);

  const rows = useMemo(() => {
    const flat: Array<
      | { type: 'header'; id: string; label: string }
      | { type: 'entry'; id: string; entry: HistoryEntry }
    > = [];
    let currentLabel = '';

    for (const entry of entries) {
      const label = formatHistoryDate(entry.playedAt, t);
      if (label !== currentLabel) {
        currentLabel = label;
        flat.push({ type: 'header', id: `header:${label}`, label });
      }
      flat.push({ type: 'entry', id: entry.id, entry });
    }

    return flat;
  }, [entries, t]);

  return (
    <div className="min-h-[400px]">
      {entries.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleClearHistory}
            className="text-[12px] text-[#ffffff99] hover:text-red-400 transition-colors cursor-pointer"
          >
            {t('library.clearHistory')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-white/20" />
        </div>
      ) : rows.length > 0 ? (
        <VirtualList
          items={rows}
          rowHeight={60}
          overscan={10}
          className="flex flex-col"
          disabled={rows.length < 60}
          getItemKey={(row) => row.id}
          renderItem={(row) =>
            row.type === 'header' ? (
              <div className="py-3">
                <h3 className="text-[13px] font-bold text-[#ffffff99] uppercase tracking-wider px-1">
                  {row.label}
                </h3>
              </div>
            ) : (
              <div className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/[.03] px-3 py-2.5 hover:bg-[#141414] transition-colors">
                <button
                  type="button"
                  className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 border border-white/10 cursor-pointer"
                  onClick={() => {
                    const tracks = entries.map(historyEntryToTrack);
                    const idx = entries.findIndex((e) => e.id === row.entry.id);
                    play(tracks[idx], tracks);
                  }}
                >
                  {row.entry.artworkUrl ? (
                    <img
                      src={art(row.entry.artworkUrl, 't200x200') ?? ''}
                      alt=""
                      className="w-full h-full object-cover"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#141414]">
                      <Music size={14} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    {playWhite14}
                  </div>
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p
                    className="text-[14px] font-medium truncate text-white hover:text-white cursor-pointer transition-colors"
                    onClick={() => navigate(`/track/${encodeURIComponent(row.entry.scTrackId)}`)}
                  >
                    {row.entry.title}
                  </p>
                  <p
                    className={`text-[12px] text-[#ffffff99] truncate mt-0.5${row.entry.artistUrn ? ' hover:text-[#ffffff99] cursor-pointer transition-colors' : ''}`}
                    onClick={() =>
                      row.entry.artistUrn &&
                      navigate(`/user/${encodeURIComponent(row.entry.artistUrn)}`)
                    }
                  >
                    {row.entry.artistName}
                  </p>
                </div>

                <span className="text-[11px] text-white/20 tabular-nums shrink-0">
                  {new Date(row.entry.playedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )
          }
        />
      ) : (
        <div className="py-20 text-center text-white/20">{t('library.historyEmpty')}</div>
      )}

      <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
        {historyQuery.isFetchingNextPage && (
          <Loader2 size={20} className="text-white/15 animate-spin" />
        )}
      </div>
    </div>
  );
});



export const Library = React.memo(() => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'playlists' | 'following' | 'history' | null;
  const [activeTab, setActiveTab] = useState<'playlists' | 'following' | 'history'>(
    tabParam === 'following' || tabParam === 'history' ? tabParam : 'playlists',
  );
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);
  const deferredFilter = useDeferredValue(filter);
  const user = useAuthStore((s) => s.user);

  const onTabFollowing = React.useCallback(() => setActiveTab('following'), []);

  const tabs = [
    { id: 'playlists', label: t('search.playlists') },
    { id: 'following', label: t('nav.following') },
    { id: 'history', label: t('library.history') },
  ] as const;

  if (!user) return null;

  return (
    <div className="px-5 py-4 pb-4 space-y-8">
      <LibraryHero onTabFollowing={onTabFollowing} />

      {}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-[#0a0a0a] border border-white/10 rounded-lg w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setFilter('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-contrast'
                    : 'text-[#ffffff99] hover:bg-[#141414] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon size={15} className="text-[#ffffff99]" />
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('library.filter')}
            className="w-full bg-[#141414] hover:bg-[#141414] focus:bg-[#141414] text-white placeholder:text-[#ffffff99] text-[13px] py-2 pl-9 pr-8 rounded-md outline-none border border-white/10 focus:border-white/30 transition-colors"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute inset-y-0 right-2 flex items-center text-[#ffffff99] hover:text-[#ffffff99] cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {activeTab === 'following' && <FollowingTab filter={deferredFilter} />}
      {activeTab === 'playlists' && <PlaylistsTab filter={deferredFilter} />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
});
