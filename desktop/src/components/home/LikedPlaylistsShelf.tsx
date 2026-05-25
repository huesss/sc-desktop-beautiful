import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import { Skeleton } from '../ui/Skeleton';
import type { Playlist } from '../../lib/hooks';
import { markPlaylistDead } from '../../lib/playlist-dead-registry';
import { useVerifiedPlaylists } from '../../lib/playlist-verify';
import { ListMusic } from '../../lib/icons';
import { PlaylistCard } from '../music/PlaylistCard';

function ShelfSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[180px] shrink-0">
          <Skeleton className="aspect-square w-full" rounded="lg" />
          <Skeleton className="h-4 w-3/4 mt-2.5" rounded="sm" />
        </div>
      ))}
    </>
  );
}

export const LikedPlaylistsShelf = React.memo(function LikedPlaylistsShelf({
  playlists,
  isLoading,
}: {
  playlists: Playlist[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { playlists: verified, verifying } = useVerifiedPlaylists(playlists, !isLoading);
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

  const visible = useMemo(
    () => verified.filter((p) => !hiddenUrns.has(p.urn)),
    [verified, hiddenUrns],
  );

  const loading = isLoading || verifying;

  if (!loading && visible.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
            <ListMusic size={15} className="text-[#ffffff99]" />
          </div>
          <h2 className="text-[15px] font-bold tracking-tight text-white">
            {t('home.likedPlaylists')}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-[11px] text-[#ffffff99] hover:text-white transition-colors cursor-pointer"
        >
          {t('common.seeAll')}
        </button>
      </div>
      <HorizontalScroll>
        {loading ? (
          <ShelfSkeleton />
        ) : (
          visible.map((playlist) => (
            <div key={playlist.urn} className="w-[180px] shrink-0">
              <PlaylistCard
                playlist={playlist}
                showPlayback
                spotifyPlay
                onUnavailable={() => hidePlaylist(playlist.urn)}
              />
            </div>
          ))
        )}
      </HorizontalScroll>
    </section>
  );
});
