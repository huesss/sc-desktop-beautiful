import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { refreshPlaylistListCaches } from '../../lib/playlist-cache';
import { markPlaylistDead } from '../../lib/playlist-dead-registry';
import { useVerifiedPlaylists } from '../../lib/playlist-verify';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import { Skeleton } from '../ui/Skeleton';
import type { FeedItem, Playlist } from '../../lib/hooks';
import { dedupeByUrn } from '../../lib/hooks';
import { Sparkles } from '../../lib/icons';
import { PlaylistCard } from '../music/PlaylistCard';

function ShelfSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[180px] shrink-0">
          <Skeleton className="aspect-square w-full" rounded="md" />
          <Skeleton className="h-4 w-3/4 mt-2.5" rounded="sm" />
        </div>
      ))}
    </>
  );
}

export const RecommendedPlaylistsShelf = React.memo(function RecommendedPlaylistsShelf({
  feedItems,
  feedLoading,
  likedPlaylists,
  myPlaylists,
  playlistsLoading,
}: {
  feedItems: FeedItem[];
  feedLoading: boolean;
  likedPlaylists: Playlist[];
  myPlaylists: Playlist[];
  playlistsLoading: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const didRefresh = useRef(false);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;
    refreshPlaylistListCaches(qc);
  }, [qc]);

  const candidates = useMemo(() => {
    const fromFeed = feedItems
      .filter((i) => !i.type.includes('track'))
      .map((i) => i.origin as Playlist);
    const merged = [...myPlaylists, ...likedPlaylists, ...fromFeed];
    return dedupeByUrn(merged).slice(0, 20);
  }, [likedPlaylists, myPlaylists, feedItems]);

  const listsReady = !playlistsLoading && !feedLoading;
  const { playlists: verified, verifying } = useVerifiedPlaylists(candidates, listsReady);
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

  const playlists = useMemo(
    () => verified.filter((p) => !hiddenUrns.has(p.urn)),
    [verified, hiddenUrns],
  );

  const loading = playlistsLoading || feedLoading || (listsReady && verifying);

  if (!loading && playlists.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
          <Sparkles size={15} className="text-[#ffffff99]" />
        </div>
        <h2 className="text-[15px] font-bold tracking-tight text-white">{t('home.recommended')}</h2>
      </div>
      <HorizontalScroll>
        {loading && playlists.length === 0 ? (
          <ShelfSkeleton />
        ) : (
          playlists.map((playlist) => (
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
