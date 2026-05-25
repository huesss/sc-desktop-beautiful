import React from 'react';
import { useTranslation } from 'react-i18next';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import { Skeleton } from '../ui/Skeleton';
import { useSearchPlaylists } from '../../lib/hooks';
import { ListMusic } from '../../lib/icons';
import { PlaylistCard } from '../music/PlaylistCard';

function ShelfSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[180px] shrink-0">
          <Skeleton className="aspect-square w-full" rounded="lg" />
          <Skeleton className="h-4 w-3/4 mt-2.5" rounded="sm" />
          <Skeleton className="h-3 w-1/2 mt-1.5" rounded="sm" />
        </div>
      ))}
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
          <ListMusic size={15} className="text-[#ffffff99]" />
        </div>
        <h2 className="text-[15px] font-bold tracking-tight text-white">{title}</h2>
      </div>
    </div>
  );
}

export const PlaylistSearchShelf = React.memo(function PlaylistSearchShelf({
  query,
  title,
  limit = 12,
  enabled = true,
}: {
  query: string;
  title: string;
  limit?: number;
  enabled?: boolean;
}) {
  const { t } = useTranslation();
  const { playlists, isLoading, isError, isFetching, refetch } = useSearchPlaylists(query, {
    enabled,
  });

  if (!isLoading && !isError && !isFetching && playlists.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} />
      <HorizontalScroll>
        {isLoading || (isFetching && playlists.length === 0) ? (
          <ShelfSkeleton count={6} />
        ) : isError && playlists.length === 0 ? (
          <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 px-4">
            <p className="text-[13px] text-white/40">{t('home.playlistShelfFailed')}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="btn-secondary h-9 px-4 text-[13px]"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          playlists.slice(0, limit).map((playlist) => (
            <div key={playlist.urn} className="w-[180px] shrink-0">
              <PlaylistCard playlist={playlist} showPlayback spotifyPlay />
            </div>
          ))
        )}
      </HorizontalScroll>
    </section>
  );
});
