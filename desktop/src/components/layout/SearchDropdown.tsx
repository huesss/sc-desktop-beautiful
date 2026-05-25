import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlaylistCard } from '../music/PlaylistCard';
import { TrackTitleArtist } from '../music/TrackTitleArtist';
import { api } from '../../lib/api';
import { preloadTrack } from '../../lib/audio';
import { art } from '../../lib/formatters';
import {
  type SCUser,
  useSearchPlaylists,
  useSearchTracks,
  useSearchUsers,
} from '../../lib/hooks';
import {
  Clock,
  ExternalLink,
  Loader2,
  Music,
  Pause,
  Play,
  Search as SearchIcon,
  Trash2,
  Users,
  X,
} from '../../lib/icons';
import { useTrackPlay } from '../../lib/useTrackPlay';
import type { Track } from '../../stores/player';
import { useSearchHistoryStore } from '../../stores/searchHistory';
import { SearchTypeTabs } from './SearchTypeTabs';

function ResolveRow({ url, onDone }: { url: string; onDone: () => void }) {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    api<{ kind: string; urn: string }>(`/resolve?url=${encodeURIComponent(url.trim())}`)
      .then((res) => {
        if (cancelled) return;
        setState('success');
        const { kind, urn } = res;
        if (kind === 'track') navigate(`/track/${encodeURIComponent(urn)}`);
        else if (kind === 'playlist' || kind === 'system-playlist')
          navigate(`/playlist/${encodeURIComponent(urn)}`);
        else if (kind === 'user') navigate(`/user/${encodeURIComponent(urn)}`);
        onDone();
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [url, navigate, onDone]);

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-white/10">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
        {state === 'loading' ? (
          <Loader2 size={16} className="animate-spin text-accent" />
        ) : (
          <ExternalLink size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white truncate">
          {state === 'loading' ? 'Открываем ссылку…' : state === 'error' ? 'Ссылка не найдена' : 'Готово'}
        </p>
        <p className="text-[11px] text-[#ffffff99] truncate">{url}</p>
      </div>
    </div>
  );
}

const DropdownTrackRow = React.memo(function DropdownTrackRow({
  track,
  queue,
  onPick,
}: {
  track: Track;
  queue: Track[];
  onPick: () => void;
}) {
  const { isThisPlaying, togglePlay } = useTrackPlay(track, queue);
  const cover = art(track.artwork_url, 'small');

  return (
    <button
      type="button"
      onClick={() => {
        togglePlay();
        onPick();
      }}
      onMouseEnter={() => preloadTrack(track.urn)}
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-white/10">
        {cover ? (
          <img src={cover} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#141414]">
            <Music size={14} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100">
          {isThisPlaying ? (
            <Pause size={14} fill="white" strokeWidth={0} />
          ) : (
            <Play size={14} fill="white" strokeWidth={0} className="ml-0.5" />
          )}
        </div>
      </div>
      <TrackTitleArtist track={track} size="sm" className="min-w-0 flex-1" />
    </button>
  );
});

function DropdownUserRow({ user, onPick }: { user: SCUser; onPick: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const avatar = art(user.avatar_url, 'small');

  return (
    <button
      type="button"
      onClick={() => {
        navigate(`/user/${encodeURIComponent(user.urn)}`);
        onPick();
      }}
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-full border border-white/10">
        {avatar ? (
          <img src={avatar} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#141414]">
            <Users size={14} className="text-white/20" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{user.username}</p>
        <p className="text-[11px] text-[#ffffff99]">{t('search.users')}</p>
      </div>
    </button>
  );
}

interface SearchDropdownProps {
  inputValue: string;
  debouncedQuery: string;
  resolveUrl: string | null;
  activeTab: 'tracks' | 'playlists' | 'users';
  onTabChange: (tab: 'tracks' | 'playlists' | 'users') => void;
  onHistorySelect: (query: string) => void;
  onFullSearch: (query: string) => void;
  onClose: () => void;
}

export const SearchDropdown = React.memo(function SearchDropdown({
  inputValue,
  debouncedQuery,
  resolveUrl,
  activeTab,
  onTabChange,
  onHistorySelect,
  onFullSearch,
  onClose,
}: SearchDropdownProps) {
  const { t } = useTranslation();
  const { queries, removeQuery, clearHistory } = useSearchHistoryStore();
  const tracksQuery = useSearchTracks(debouncedQuery);
  const playlistsQuery = useSearchPlaylists(debouncedQuery);
  const usersQuery = useSearchUsers(debouncedQuery);

  const showHistory = !inputValue.trim() && !resolveUrl && queries.length > 0;
  const showResults = !!debouncedQuery && !resolveUrl;

  const tabs = [
    { id: 'tracks' as const, label: t('search.tracks') },
    { id: 'playlists' as const, label: t('search.playlists') },
    { id: 'users' as const, label: t('search.users') },
  ] as const;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-[#282828] shadow-[0_16px_48px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
      {resolveUrl && <ResolveRow url={resolveUrl} onDone={onClose} />}

      {showHistory && (
        <>
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-white">{t('search.recent')}</span>
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1 text-[11px] text-[#ffffff99] hover:text-white transition-colors"
            >
              <Trash2 size={11} />
              {t('search.clearHistory')}
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-0.5">
            {queries.map((query) => (
              <div
                key={query}
                className="group flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer"
                onClick={() => onHistorySelect(query)}
              >
                <Clock size={14} className="shrink-0 text-[#ffffff99]" />
                <span className="flex-1 truncate text-[13px] text-white">{query}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQuery(query);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#ffffff99] hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {!inputValue.trim() && !resolveUrl && queries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-[#ffffff99]">
          <SearchIcon size={28} className="opacity-40" />
          <p className="text-[12px]">{t('search.hint')}</p>
        </div>
      )}

      {showResults && (
        <>
          <div className="px-4 py-3 border-b border-white/10">
            <SearchTypeTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          </div>
          <div className="max-h-[min(320px,42vh)] overflow-y-auto">
            {activeTab === 'tracks' && (
              <>
                {tracksQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-white/20" />
                  </div>
                ) : tracksQuery.tracks.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-[#ffffff99]">{t('search.noResults')}</p>
                ) : (
                  tracksQuery.tracks.slice(0, 12).map((track) => (
                    <DropdownTrackRow
                      key={track.urn}
                      track={track}
                      queue={tracksQuery.tracks}
                      onPick={onClose}
                    />
                  ))
                )}
              </>
            )}
            {activeTab === 'playlists' && (
              <>
                {playlistsQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-white/20" />
                  </div>
                ) : playlistsQuery.playlists.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-[#ffffff99]">{t('search.noResults')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {playlistsQuery.playlists.slice(0, 8).map((p, i) => (
                      <div key={`${p.urn}-${i}`} onClick={onClose}>
                        <PlaylistCard playlist={p} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === 'users' && (
              <>
                {usersQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-white/20" />
                  </div>
                ) : usersQuery.users.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-[#ffffff99]">{t('search.noResults')}</p>
                ) : (
                  usersQuery.users.slice(0, 10).map((user, i) => (
                    <DropdownUserRow key={`${user.urn}-${i}`} user={user} onPick={onClose} />
                  ))
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onFullSearch(debouncedQuery)}
            className="border-t border-white/10 px-4 py-2.5 text-center text-[12px] font-medium text-[#b3b3b3] hover:bg-[#ffffff14] hover:text-white transition-colors"
          >
            {t('search.showAll')}
          </button>
        </>
      )}
    </div>
  );
});
