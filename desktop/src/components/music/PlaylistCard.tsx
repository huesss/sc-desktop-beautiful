import React from 'react';
import { useNavigate } from 'react-router-dom';
import { art, fc } from '../../lib/formatters';
import type { Playlist } from '../../lib/hooks';
import { isPlaylistReachable } from '../../lib/playlist-dead-registry';
import { Heart, ListMusic, Play, pauseBlack22 } from '../../lib/icons';
import type { PlaybackContext } from '../../lib/playback-context';
import { usePlaybackInContext } from '../../lib/playback-context';
import { useAutoHide } from '../../lib/useAutoHide';
import type { Track } from '../../stores/player';
import { usePlayerStore } from '../../stores/player';

interface PlaylistCardProps {
  playlist: Playlist;
  showPlayback?: boolean;
  spotifyPlay?: boolean;
  onUnavailable?: () => void;
}

export const PlaylistCard = React.memo(
  function PlaylistCard({ playlist, showPlayback, spotifyPlay, onUnavailable }: PlaylistCardProps) {
    const navigate = useNavigate();
    const cover =
      art(playlist.artwork_url, 't300x300') ?? art(playlist.tracks?.[0]?.artwork_url, 't300x300');

    const trackUrns = React.useMemo(
      () => new Set((playlist.tracks ?? []).map((t: Track) => t.urn)),
      [playlist.tracks],
    );
    const playbackContext: PlaybackContext | null = showPlayback
      ? { kind: 'playlist', urn: playlist.urn }
      : null;
    const { isPlayingFromThis: playingHere, isPausedFromThis: pausedHere } =
      usePlaybackInContext(playbackContext, trackUrns);
    const isPlayingFromThis = !!showPlayback && playingHere;
    const isPausedFromThis = !!showPlayback && pausedHere;
    const showPlayingOverlay = useAutoHide(isPlayingFromThis);

    React.useEffect(() => {
      if (cover || !onUnavailable) return;
      let cancelled = false;
      void isPlaylistReachable(playlist.urn).then((ok) => {
        if (!cancelled && !ok) onUnavailable();
      });
      return () => {
        cancelled = true;
      };
    }, [cover, playlist.urn, onUnavailable]);

    const handlePlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      const { play, pause, resume } = usePlayerStore.getState();
      if (isPlayingFromThis) {
        pause();
        return;
      }
      if (isPausedFromThis) {
        resume();
        return;
      }
      if (playlist.tracks && playlist.tracks.length > 0) {
        play(playlist.tracks[0], playlist.tracks, { kind: 'playlist', urn: playlist.urn });
      } else {
        navigate(`/playlist/${encodeURIComponent(playlist.urn)}`);
      }
    };

    return (
      <div
        className={`group relative flex flex-col cursor-pointer select-none ${
          showPlayback && spotifyPlay ? 'gap-2' : 'gap-3'
        }`}
        onClick={() => navigate(`/playlist/${encodeURIComponent(playlist.urn)}`)}
      >
        <div className="relative aspect-square rounded-md overflow-hidden bg-[#0a0a0a] ring-1 ring-white/10 transition-all duration-300 ease-[var(--ease-apple)] group-hover:ring-white/[0.15]">
          {cover ? (
            <img
              src={cover}
              alt={playlist.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover:scale-[1.05]"
              decoding="async"
              onError={() => onUnavailable?.()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-transparent">
              <ListMusic size={32} className="text-white/10" />
            </div>
          )}

          {}
          {showPlayback && (
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                spotifyPlay
                  ? `bg-black/0 opacity-0 group-hover:bg-black/25 group-hover:opacity-100 ${
                      showPlayingOverlay ? 'bg-black/25 opacity-100' : ''
                    }`
                  : `flex items-center justify-center group-hover:bg-black/40 group-hover:opacity-100 ${
                      showPlayingOverlay ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'
                    }`
              }`}
            >
              <div
                onClick={handlePlay}
                className={
                  spotifyPlay
                    ? `absolute bottom-2.5 right-2.5 flex size-11 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg transition-all duration-300 ease-[var(--ease-apple)] hover:scale-105 active:scale-95 ${
                        showPlayingOverlay
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                      }`
                    : `flex w-14 h-14 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-apple)] shadow-2xl hover:scale-110 active:scale-95 group-hover:scale-100 ${
                        showPlayingOverlay ? 'bg-white scale-100' : 'bg-white/90 scale-75'
                      }`
                }
              >
                {isPlayingFromThis ? (
                  pauseBlack22
                ) : spotifyPlay ? (
                  <Play size={20} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                ) : (
                  <Play size={22} fill="black" strokeWidth={0} className="ml-1" />
                )}
              </div>
            </div>
          )}

          {playlist.track_count != null && (
            <div
              className={`absolute top-2 left-2 flex items-center gap-1.5 text-[11px] font-medium bg-black/60 text-white px-2.5 py-1 rounded-full shadow-lg ${
                showPlayback && spotifyPlay
                  ? 'opacity-100'
                  : showPlayback
                    ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                    : 'opacity-100'
              }`}
            >
              <ListMusic size={11} />
              {playlist.track_count}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`font-semibold text-white truncate leading-tight group-hover:text-white transition-colors duration-200 ${
              showPlayback && spotifyPlay ? 'text-[13px]' : 'text-[14px] leading-snug px-1'
            }`}
          >
            {playlist.title}
          </p>
          {showPlayback ? (
            <div
              className={`flex items-center gap-1.5 min-w-0 ${
                spotifyPlay ? 'mt-1.5' : 'mt-1 px-1'
              }`}
            >
              <span
                className={
                  spotifyPlay
                    ? 'inline-flex w-fit shrink-0 items-center rounded-[3px] bg-[#3e3e3e] px-1.5 py-[2px] text-[10px] font-bold uppercase leading-none text-[#b3b3b3]'
                    : 'inline-flex w-fit shrink-0 items-center rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffffff99]'
                }
              >
                {spotifyPlay ? 'Playlist' : playlist.playlist_type || 'Playlist'}
              </span>
              {playlist.likes_count > 0 && (
                <span className="text-[11px] text-[#ffffff99] tabular-nums flex items-center gap-1 shrink-0">
                  <Heart size={10} className="text-white/20" />
                  {fc(playlist.likes_count)}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[#ffffff99] truncate mt-1">
              {playlist.user?.username || 'Unknown'}
            </p>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.playlist.urn === next.playlist.urn &&
    prev.showPlayback === next.showPlayback &&
    prev.spotifyPlay === next.spotifyPlay &&
    prev.onUnavailable === next.onUnavailable,
);
