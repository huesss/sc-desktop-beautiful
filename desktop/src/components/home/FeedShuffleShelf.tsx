import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrackCard } from '../music/TrackCard';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import type { FeedItem } from '../../lib/hooks';
import { Shuffle } from '../../lib/icons';
import type { Track } from '../../stores/player';

function ShelfSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[180px] shrink-0">
          <div className="aspect-square w-full rounded-lg bg-white/5" />
          <div className="mt-2.5 h-4 w-3/4 rounded-sm bg-white/5" />
        </div>
      ))}
    </>
  );
}

function shuffleTracks(tracks: Track[]): Track[] {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const FeedShuffleShelf = React.memo(function FeedShuffleShelf({
  feedItems,
  isLoading,
}: {
  feedItems: FeedItem[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  const tracks = useMemo(() => {
    const list = feedItems
      .filter((i) => i.type.includes('track'))
      .map((i) => i.origin as Track);
    return shuffleTracks(list).slice(0, 24);
  }, [feedItems]);

  if (!isLoading && tracks.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
          <Shuffle size={15} className="text-[#ffffff99]" />
        </div>
        <h2 className="text-[15px] font-bold tracking-tight text-white">{t('home.feedShuffle')}</h2>
      </div>
      <HorizontalScroll>
        {isLoading ? (
          <ShelfSkeleton />
        ) : (
          tracks.map((track) => (
            <div key={track.urn} className="w-[180px] shrink-0">
              <TrackCard track={track} queue={tracks} />
            </div>
          ))
        )}
      </HorizontalScroll>
    </section>
  );
});
