import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { api } from '../../lib/api';
import { invalidateAllLikesCache } from '../../lib/hooks';
import { Check, Heart } from '../../lib/icons';
import { optimisticToggleLike, useLiked } from '../../lib/likes';
import type { Track } from '../../stores/player';

export const LikeButton = React.memo(function LikeButton({
  track,
  variant = 'inline',
}: {
  track: Track;
  variant?: 'overlay' | 'inline' | 'pinned';
}) {
  const liked = useLiked(track.urn);
  const qc = useQueryClient();

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !liked;
    optimisticToggleLike(qc, track, next);
    invalidateAllLikesCache();
    try {
      await api(`/likes/tracks/${encodeURIComponent(track.urn)}`, {
        method: next ? 'POST' : 'DELETE',
        body: next ? JSON.stringify(track) : undefined,
      });
    } catch {
      optimisticToggleLike(qc, track, !next);
    }
  };

  if (variant === 'pinned') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
          liked
            ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:brightness-110'
            : 'text-white/25 hover:bg-white/10 hover:text-white/60'
        }`}
      >
        {liked ? (
          <Check size={12} strokeWidth={3} />
        ) : (
          <Heart size={13} strokeWidth={1.75} />
        )}
      </button>
    );
  }

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`cursor-pointer absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ${
          liked
            ? 'bg-accent/80 text-accent-contrast'
            : 'bg-black/50 text-[#ffffff99] hover:text-white hover:bg-black/70'
        }`}
      >
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 ${
        liked ? 'text-accent' : 'text-white/20 hover:text-[#ffffff99]'
      }`}
    >
      <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
    </button>
  );
});
