import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchTypeTabs } from '../components/layout/SearchTypeTabs';
import { AddToPlaylistDialog } from '../components/music/AddToPlaylistDialog';
import { LikeButton } from '../components/music/LikeButton';
import { PlaylistCard } from '../components/music/PlaylistCard';
import { TrackTitleArtist } from '../components/music/TrackTitleArtist';
import { VirtualList } from '../components/ui/VirtualList';
import { preloadTrack } from '../lib/audio';
import { art, dur, fc } from '../lib/formatters';
import {
  type SCUser,
  useInfiniteScroll,
  useSearchPlaylists,
  useSearchTracks,
  useSearchUsers,
} from '../lib/hooks';
import {
  Clock,
  headphones11,
  heart11,
  ListPlus,
  Loader2,
  musicIcon20,
  Pause,
  Play,
  Search as SearchIcon,
  Trash2,
  Users,
  X,
} from '../lib/icons';
import { useTrackPlay } from '../lib/useTrackPlay';
import type { Track } from '../stores/player';
import { useSearchHistoryStore } from '../stores/searchHistory';



const TrackRow = React.memo(
  function TrackRow({ track, queue }: { track: Track; queue: Track[] }) {
    const { t } = useTranslation();
    const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue);
    const cover = art(track.artwork_url, 't200x200');

    return (
      <div
        className={`group flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ease-[var(--ease-apple)] ${
          isThis
            ? ''
            : 'hover:bg-[#141414]'
        }`}
        onMouseEnter={() => preloadTrack(track.urn)}
      >
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer"
          onClick={togglePlay}
        >
          {isThisPlaying ? (
            <div className="w-9 h-9 rounded-full bg-accent text-accent-contrast flex items-center justify-center  scale-100 animate-fade-in-up">
              <Pause size={16} fill="currentColor" strokeWidth={0} />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/[0.06] group-hover:bg-white/10 flex items-center justify-center transition-all">
              <Play
                size={16}
                fill="white"
                strokeWidth={0}
                className="ml-0.5 opacity-60 group-hover:opacity-100"
              />
            </div>
          )}
        </div>

        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 shadow-md">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.05] to-transparent">
              {musicIcon20}
            </div>
          )}
        </div>

        <TrackTitleArtist
          track={track}
          highlight={isThis}
          size="md"
          className="flex flex-col justify-center"
        />

        <div className="hidden md:flex items-center gap-2 shrink-0 pr-4">
          {track.playback_count != null && (
            <span className="text-[11px] text-[#ffffff99] tabular-nums flex items-center gap-1.5 w-16">
              {headphones11}
              {fc(track.playback_count)}
            </span>
          )}
          <span className="text-[11px] text-[#ffffff99] tabular-nums flex items-center gap-1.5 w-14">
            {heart11}
            {fc(track.favoritings_count ?? track.likes_count)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <LikeButton track={track} />
          <AddToPlaylistDialog trackUrns={[track.urn]}>
            <button
              type="button"
              className="cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-[#ffffff99] opacity-0 group-hover:opacity-100 transition-all duration-200"
              title={t('playlist.addToPlaylist')}
            >
              <ListPlus size={14} />
            </button>
          </AddToPlaylistDialog>
        </div>

        <span className="text-[12px] text-[#ffffff99] tabular-nums font-medium shrink-0 w-12 text-right">
          {dur(track.duration)}
        </span>
      </div>
    );
  },
  (prev, next) =>
    prev.track.urn === next.track.urn && prev.track.user_favorite === next.track.user_favorite,
);

const UserCard = React.memo(({ user }: { user: SCUser }) => {
  const navigate = useNavigate();
  const avatar = art(user.avatar_url, 't300x300');

  return (
    <div
      className="group flex flex-col items-center gap-2 p-5 rounded-lg bg-[#0a0a0a] hover:bg-[#141414] border border-white/10 hover:border-white/10 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/user/${encodeURIComponent(user.urn)}`)}
    >
      <div className="relative w-24 h-24 rounded-full shadow-xl overflow-hidden ring-2 ring-white/[0.05] group-hover:ring-white/[0.15] group-hover:scale-105 transition-all duration-500">
        {avatar ? (
          <img
            src={avatar}
            alt={user.username}
            className="w-full h-full object-cover"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Users size={32} className="text-white/20" />
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



const SearchHistory = React.memo(function SearchHistory({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  const { t } = useTranslation();
  const { queries, removeQuery, clearHistory } = useSearchHistoryStore();

  if (queries.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[12px] font-semibold text-[#ffffff99] uppercase tracking-wider">
          {t('search.history')}
        </span>
        <button
          type="button"
          onClick={clearHistory}
          className="flex items-center gap-1.5 text-[11px] text-[#ffffff99] hover:text-[#ffffff99] transition-colors cursor-pointer"
        >
          <Trash2 size={11} />
          {t('search.clearHistory')}
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {queries.map((query) => (
          <div
            key={query}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#141414] transition-all duration-200 cursor-pointer"
            onClick={() => onSelect(query)}
          >
            <Clock size={13} className="text-white/20 shrink-0" />
            <span className="flex-1 text-[13px] text-[#ffffff99] group-hover:text-white transition-colors truncate">
              {query}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeQuery(query);
              }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-white/20 hover:text-[#ffffff99] transition-all cursor-pointer shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});



const SearchTracksTab = React.memo(function SearchTracksTab({ query }: { query: string }) {
  const { t } = useTranslation();
  const tracksQuery = useSearchTracks(query);
  const sentinelRef = useInfiniteScroll(
    !!tracksQuery.hasNextPage,
    !!tracksQuery.isFetchingNextPage,
    tracksQuery.fetchNextPage,
  );

  return (
    <div className="min-h-[400px]">
      {tracksQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-white/20" />
        </div>
      ) : tracksQuery.tracks.length === 0 ? (
        <div className="py-20 text-center text-[#ffffff99]">{t('search.noResults')}</div>
      ) : (
        <VirtualList
          items={tracksQuery.tracks}
          rowHeight={68}
          overscan={8}
          className="flex flex-col gap-1"
          disabled={tracksQuery.tracks.length < 40}
          getItemKey={(track) => track.urn}
          renderItem={(track) => <TrackRow track={track} queue={tracksQuery.tracks} />}
        />
      )}
      <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-6">
        {tracksQuery.isFetchingNextPage && (
          <Loader2 size={24} className="text-white/20 animate-spin" />
        )}
      </div>
    </div>
  );
});

const SearchPlaylistsTab = React.memo(function SearchPlaylistsTab({ query }: { query: string }) {
  const { t } = useTranslation();
  const playlistsQuery = useSearchPlaylists(query);
  const sentinelRef = useInfiniteScroll(
    !!playlistsQuery.hasNextPage,
    !!playlistsQuery.isFetchingNextPage,
    playlistsQuery.fetchNextPage,
  );

  return (
    <div className="min-h-[400px]">
      {playlistsQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-white/20" />
        </div>
      ) : playlistsQuery.playlists.length === 0 ? (
        <div className="py-20 text-center text-[#ffffff99]">{t('search.noResults')}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {playlistsQuery.playlists.map((p, i) => (
            <PlaylistCard key={`${p.urn}-${i}`} playlist={p} />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-6">
        {playlistsQuery.isFetchingNextPage && (
          <Loader2 size={24} className="text-white/20 animate-spin" />
        )}
      </div>
    </div>
  );
});

const SearchUsersTab = React.memo(function SearchUsersTab({ query }: { query: string }) {
  const { t } = useTranslation();
  const usersQuery = useSearchUsers(query);
  const sentinelRef = useInfiniteScroll(
    !!usersQuery.hasNextPage,
    !!usersQuery.isFetchingNextPage,
    usersQuery.fetchNextPage,
  );

  return (
    <div className="min-h-[400px]">
      {usersQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-white/20" />
        </div>
      ) : usersQuery.users.length === 0 ? (
        <div className="py-20 text-center text-[#ffffff99]">{t('search.noResults')}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {usersQuery.users.map((u, i) => (
            <UserCard key={`${u.urn}-${i}`} user={u} />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-6">
        {usersQuery.isFetchingNextPage && (
          <Loader2 size={24} className="text-white/20 animate-spin" />
        )}
      </div>
    </div>
  );
});

const SearchEmpty = React.memo(function SearchEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-white/20">
      <SearchIcon size={48} className="mb-4 opacity-50" />
      <p className="text-sm font-medium">{t('search.hint')}</p>
    </div>
  );
});



export const Search = React.memo(() => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = (searchParams.get('q') ?? '').trim();
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'users'>('tracks');

  const addQuery = useSearchHistoryStore((s) => s.addQuery);

  useEffect(() => {
    if (urlQuery) addQuery(urlQuery);
  }, [urlQuery, addQuery]);

  const tabs = [
    { id: 'tracks' as const, label: t('search.tracks') },
    { id: 'playlists' as const, label: t('search.playlists') },
    { id: 'users' as const, label: t('search.users') },
  ];

  const historyQueries = useSearchHistoryStore((s) => s.queries);
  const showHistory = !urlQuery && historyQueries.length > 0;
  const showEmpty = !urlQuery && historyQueries.length === 0;

  const handleHistorySelect = (query: string) => {
    addQuery(query);
    setSearchParams({ q: query });
  };

  return (
    <div className="px-5 py-4 pb-4 space-y-6">
      {urlQuery && (
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold text-white tracking-tight">{urlQuery}</h1>
          <SearchTypeTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      )}

      {showHistory && <SearchHistory onSelect={handleHistorySelect} />}

      {showEmpty && <SearchEmpty />}

      {urlQuery && activeTab === 'tracks' && <SearchTracksTab query={urlQuery} />}
      {urlQuery && activeTab === 'playlists' && <SearchPlaylistsTab query={urlQuery} />}
      {urlQuery && activeTab === 'users' && <SearchUsersTab query={urlQuery} />}
    </div>
  );
});
