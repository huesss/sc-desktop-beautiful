import type { DragEndEvent } from '@dnd-kit/core';
import * as Dialog from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TrackTableView, useTrackTableSort } from '../components/music/TrackTable';
import { art, dateFormatted, durLong, fc } from '../lib/formatters';
import { sortPlaylistTracks } from '../lib/playlist-track-sort';
import {
  useDeletePlaylist,
  useInfiniteScroll,
  normalizePlaylistTracks,
  usePlaylist,
  usePlaylistTracks,
  useUpdatePlaylistTracks,
} from '../lib/hooks';
import {
  AlertCircle,
  Calendar,
  Clock,
  Heart,
  ListMusic,
  Loader2,
  pauseCurrent16,
  playCurrent16,
  Trash2,
  X,
} from '../lib/icons';
import type { PlaybackContext } from '../lib/playback-context';
import { usePlaybackInContext } from '../lib/playback-context';
import { useAuthStore } from '../stores/auth';
import { type Track, usePlayerStore } from '../stores/player';

export const PlaylistPage = React.memo(() => {
  const { urn: urnParam } = useParams<{ urn: string }>();
  const urn = useMemo(() => {
    if (!urnParam) return undefined;
    try {
      return decodeURIComponent(urnParam);
    } catch {
      return urnParam;
    }
  }, [urnParam]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const myUrn = useAuthStore((s) => s.user?.urn);
  const { data: playlist, isLoading: playlistLoading } = usePlaylist(urn);
  const {
    tracks: playlistTracks,
    isLoading: tracksLoading,
    isError: tracksError,
    isFetching: tracksFetching,
    refetch: refetchTracks,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePlaylistTracks(urn);
  const tracksRetryRef = useRef(0);
  const updateTracks = useUpdatePlaylistTracks(urn);
  const deletePlaylist = useDeletePlaylist();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { sort, cycleSort, setSort } = useTrackTableSort();
  const isLoading = playlistLoading || tracksLoading;
  const isOwner = !!playlist && !!myUrn && playlist.user.urn === myUrn;

  const serverTracks: Track[] = React.useMemo(() => {
    if (isLoading || !playlist) return [];
    if (playlistTracks.length > 0) return playlistTracks;
    const embedded = normalizePlaylistTracks(playlist.tracks ?? []);
    return embedded;
  }, [isLoading, playlist, playlistTracks]);

  useEffect(() => {
    tracksRetryRef.current = 0;
  }, [urn]);

  useEffect(() => {
    if (!urn || !playlist || playlist.track_count <= 0) return;
    if (playlistTracks.length > 0 || tracksLoading || tracksFetching) return;
    if (tracksRetryRef.current >= 2) return;
    tracksRetryRef.current += 1;
    void queryClient.invalidateQueries({ queryKey: ['playlist', urn, 'tracks'] });
    void refetchTracks();
  }, [
    urn,
    playlist,
    playlistTracks.length,
    tracksLoading,
    tracksFetching,
    queryClient,
    refetchTracks,
  ]);

  
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  
  const pendingMutationRef = useRef(false);
  useEffect(() => {
    if (!pendingMutationRef.current) setLocalTracks(serverTracks);
  }, [serverTracks]);

  useEffect(() => {
    setSort(null);
  }, [urn, setSort]);

  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null!);
  const debouncedUpdate = useCallback(
    (tracks: Track[], successMsg?: string) => {
      pendingMutationRef.current = true;
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        updateTracks.mutate(
          tracks.map((t) => t.urn),
          {
            onSuccess: () => {
              pendingMutationRef.current = false;
              if (successMsg) toast.success(successMsg);
            },
            onError: () => {
              pendingMutationRef.current = false;
              
              setLocalTracks(serverTracks);
            },
          },
        );
      }, 600);
    },
    [updateTracks, serverTracks],
  );

  const tracks = isOwner ? localTracks : serverTracks;

  const displayedTracks = useMemo(
    () => sortPlaylistTracks(tracks, sort),
    [tracks, sort],
  );

  const trackCountDisplay =
    tracks.length > 0 ? tracks.length : Math.max(playlist?.track_count ?? 0, 0);
  const tracksMissing =
    !!playlist &&
    playlist.track_count > 0 &&
    tracks.length === 0 &&
    !tracksLoading &&
    !tracksFetching;

  const trackUrnSet = React.useMemo(
    () => new Set(displayedTracks.map((t) => t.urn)),
    [displayedTracks],
  );

  const playlistContext = React.useMemo(
    (): PlaybackContext | null =>
      playlist ? { kind: 'playlist', urn: playlist.urn } : null,
    [playlist?.urn],
  );
  const { isPausedFromThis, isPlayingFromThis } = usePlaybackInContext(playlistContext, trackUrnSet);

  const scrollRef = useInfiniteScroll(hasNextPage ?? false, isFetchingNextPage, fetchNextPage);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localTracks.findIndex((t) => t.urn === active.id);
    const newIndex = localTracks.findIndex((t) => t.urn === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newTracks = [...localTracks];
    const [moved] = newTracks.splice(oldIndex, 1);
    newTracks.splice(newIndex, 0, moved);
    setLocalTracks(newTracks);
    debouncedUpdate(newTracks, t('playlist.reordered'));
  };

  const handleRemoveTrack = (trackUrn: string) => {
    const newTracks = localTracks.filter((t) => t.urn !== trackUrn);
    setLocalTracks(newTracks);
    debouncedUpdate(newTracks, t('playlist.trackRemoved'));
  };

  if (isLoading || !playlist) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const playbackCtx: PlaybackContext = { kind: 'playlist', urn: playlist.urn };
  const cover = art(playlist.artwork_url, 't500x500') ?? art(tracks[0]?.artwork_url, 't500x500');

  const handlePlayAll = () => {
    if (displayedTracks.length === 0) return;
    const { play, pause, resume } = usePlayerStore.getState();
    if (isPlayingFromThis) {
      pause();
    } else if (isPausedFromThis) {
      resume();
    } else {
      play(displayedTracks[0], displayedTracks, playbackCtx);
    }
  };

  const handleDelete = () => {
    deletePlaylist.mutate(playlist.urn, {
      onSuccess: () => {
        toast.success(t('playlist.deleted'));
        navigate(-1);
      },
    });
  };

  return (
    <div className="px-5 py-4 pb-4 space-y-7 animate-fade-in-up">
      {}
      <section className="rounded-lg border border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-4 p-5">
          <div className="relative size-36 shrink-0 overflow-hidden rounded-md border border-white/10 sm:size-40">
            {cover ? (
              <img
                src={cover}
                alt={playlist.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                <ListMusic size={48} className="text-white/15" />
              </div>
            )}

            <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white/70">
              <ListMusic size={10} />
              {trackCountDisplay}
            </div>
          </div>

          {}
          <div className="flex-1 min-w-0 py-2">
            <span className="mb-3 inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {playlist.playlist_type || 'Playlist'}
            </span>

            <h1 className="text-2xl font-bold text-white leading-tight mb-2 line-clamp-2">
              {playlist.title}
            </h1>

            {}
            <div
              className="flex items-center gap-2.5 mb-5 cursor-pointer group/artist"
              onClick={() => navigate(`/user/${encodeURIComponent(playlist.user.urn)}`)}
            >
              {playlist.user.avatar_url && (
                <img
                  src={art(playlist.user.avatar_url, 'small') ?? ''}
                  alt=""
                  className="w-6 h-6 rounded-full ring-1 ring-white/10 group-hover/artist:ring-white/[0.15] transition-all duration-150"
                />
              )}
              <span className="text-[14px] text-[#ffffff99] group-hover/artist:text-[#ffffff99] transition-colors">
                {playlist.user.username}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePlayAll}
                className="btn-primary inline-flex items-center gap-2 pl-4 pr-5 h-10 text-sm font-medium"
              >
                {isPlayingFromThis ? pauseCurrent16 : playCurrent16}
                {t('playlist.playAll')}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title={t('playlist.delete')}
                  aria-label={t('playlist.delete')}
                  className="btn-secondary inline-flex items-center justify-center w-10 h-10 px-0"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="flex items-center gap-5 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99]">
          <ListMusic size={13} className="text-white/20" />
          <span className="tabular-nums font-medium">{trackCountDisplay}</span>
          <span className="text-white/15">{t('search.tracks').toLowerCase()}</span>
        </div>
        {playlist.likes_count != null && (
          <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99]">
            <Heart size={13} className="text-white/20" />
            <span className="tabular-nums font-medium">{fc(playlist.likes_count)}</span>
            <span className="text-white/15">{t('track.likes')}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99] ml-auto">
          <Clock size={12} />
          <span className="tabular-nums">{durLong(playlist.duration)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-white/20">
          <Calendar size={12} />
          <span>{dateFormatted(playlist.created_at)}</span>
        </div>
      </section>

      {}
      {playlist.description && (
        <section className="glass rounded-lg p-5">
          <p className="text-[13px] text-[#ffffff99] leading-relaxed whitespace-pre-wrap break-words">
            {playlist.description}
          </p>
        </section>
      )}

      {}
      <section>
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            {tracksLoading || tracksFetching ? (
              <Loader2 size={24} className="animate-spin text-accent" />
            ) : (
              <ListMusic size={32} className="mx-auto text-white/10" />
            )}
            <p className="text-[13px] text-white/20">
              {tracksMissing || tracksError
                ? t('playlist.tracksLoadFailed')
                : t('playlist.noTracks')}
            </p>
            {(tracksMissing || tracksError) && (
              <button
                type="button"
                onClick={() => {
                  tracksRetryRef.current = 0;
                  void queryClient.invalidateQueries({ queryKey: ['playlist', urn, 'tracks'] });
                  void refetchTracks();
                }}
                className="btn-secondary h-9 px-4 text-[13px]"
              >
                {t('playlist.retryTracks')}
              </button>
            )}
          </div>
        ) : (
          <TrackTableView
            tracks={displayedTracks}
            playbackContext={playbackCtx}
            sort={sort}
            onCycleSort={cycleSort}
            isOwner={isOwner}
            onRemove={isOwner ? handleRemoveTrack : undefined}
            onDragEnd={isOwner ? handleDragEnd : undefined}
            footer={
              hasNextPage ? (
                <div ref={scrollRef} className="flex justify-center py-4">
                  {isFetchingNextPage && (
                    <Loader2 size={20} className="animate-spin text-[#ffffff99]" />
                  )}
                </div>
              ) : undefined
            }
          />
        )}
      </section>

      {}
      <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[380px] rounded-lg glass border border-white/10 shadow-2xl animate-fade-in-up px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <Dialog.Title className="text-[15px] font-bold text-white">
                {t('playlist.delete')}
              </Dialog.Title>
              <Dialog.Close className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/5 transition-all">
                <X size={14} />
              </Dialog.Close>
            </div>
            <p className="text-[13px] text-[#ffffff99] leading-relaxed">
              {t('playlist.deleteConfirm', { title: playlist.title })}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Dialog.Close className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/5 transition-all cursor-pointer">
                {t('common.cancel') ?? 'Cancel'}
              </Dialog.Close>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePlaylist.isPending}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletePlaylist.isPending ? t('common.loading') : t('playlist.delete')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
});
