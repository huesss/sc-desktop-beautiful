import React from 'react';
import { preloadTrack } from '../../lib/audio';
import { art, dur, fc } from '../../lib/formatters';
import {
  headphones11,
  heart11,
  ListPlus,
  Music,
  pauseWhite14,
  playWhite14,
} from '../../lib/icons';
import type { PlaybackContext } from '../../lib/playback-context';
import { useTrackPlay } from '../../lib/useTrackPlay';
import type { Track } from '../../stores/player';
import { AddToPlaylistDialog } from '../music/AddToPlaylistDialog';
import { LikeButton } from '../music/LikeButton';
import { TrackTitleArtist } from '../music/TrackTitleArtist';
import type { Aura } from '../../lib/aura';

interface ThemedTrackRowProps {
  track: Track;
  index: number;
  queue: Track[];
  playbackContext: PlaybackContext;
  aura: Aura;
}

function ThemedTrackRowImpl({ track, index, queue, playbackContext }: ThemedTrackRowProps) {
  const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue, playbackContext);
  const cover = art(track.artwork_url, 't200x200');

  return (
    <div
      className={`group flex select-none items-center gap-2 rounded-md px-4 py-2.5 transition-colors ${
        isThis ? 'bg-accent/10 ring-1 ring-inset ring-accent/30' : 'hover:bg-white/[0.04]'
      }`}
      onMouseEnter={() => preloadTrack(track.urn)}
    >
      <div
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center"
        onClick={togglePlay}
      >
        {isThisPlaying ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-contrast">
            {pauseWhite14}
          </div>
        ) : (
          <>
            <span className="text-[12px] font-semibold tabular-nums text-[#ffffff99] transition-opacity group-hover:opacity-0">
              {index + 1}
            </span>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#141414]">
                {playWhite14}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#141414]">
            <Music size={16} className="text-white/20" />
          </div>
        )}
      </div>

      <TrackTitleArtist track={track} highlight={isThis} size="md" className="min-w-0 flex-1" />

      <div className="hidden shrink-0 items-center gap-5 pr-2 text-[11px] text-[#ffffff99] md:flex">
        {track.playback_count != null && (
          <span className="inline-flex w-16 items-center gap-1.5 tabular-nums">
            {headphones11} {fc(track.playback_count)}
          </span>
        )}
        {(track.favoritings_count ?? track.likes_count) != null && (
          <span className="inline-flex w-14 items-center gap-1.5 tabular-nums">
            {heart11} {fc(track.favoritings_count ?? track.likes_count)}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <LikeButton track={track} />
        <AddToPlaylistDialog trackUrns={[track.urn]}>
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#ffffff99] opacity-0 transition-all hover:bg-white/5 hover:text-white group-hover:opacity-100"
          >
            <ListPlus size={14} />
          </button>
        </AddToPlaylistDialog>
      </div>

      <span className="w-12 shrink-0 text-right text-[12px] font-medium tabular-nums text-[#ffffff99]">
        {dur(track.duration)}
      </span>
    </div>
  );
}

const areEqual = (prev: ThemedTrackRowProps, next: ThemedTrackRowProps) =>
  prev.track.urn === next.track.urn &&
  prev.index === next.index &&
  prev.track.user_favorite === next.track.user_favorite;

export const ThemedTrackRow = React.memo(ThemedTrackRowImpl, areEqual);
