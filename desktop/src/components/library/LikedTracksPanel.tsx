import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddToPlaylistDialog } from '../music/AddToPlaylistDialog';
import { TrackTableView, useTrackTableSort } from '../music/TrackTable';
import { art, fc } from '../../lib/formatters';
import {
  fetchAllLikedTracks,
  useInfiniteScroll,
  useLikedTracks,
} from '../../lib/hooks';
import {
  Heart,
  ListMusic,
  ListPlus,
  Loader2,
  Play,
  Search as SearchIcon,
  X,
} from '../../lib/icons';
import type { PlaybackContext } from '../../lib/playback-context';
import { sortPlaylistTracks } from '../../lib/playlist-track-sort';
import { useAuthStore } from '../../stores/auth';
import type { Track } from '../../stores/player';
import { usePlayerStore } from '../../stores/player';

const LIKES_PLAYBACK: PlaybackContext = { kind: 'likes' };

function LikesRowActions({ track }: { track: Track }) {
  const { t } = useTranslation();
  const addToQueueNext = usePlayerStore((s) => s.addToQueueNext);

  return (
    <>
      <AddToPlaylistDialog trackUrns={[track.urn]}>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white"
          title={t('playlist.addToPlaylist')}
        >
          <ListMusic size={15} />
        </button>
      </AddToPlaylistDialog>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          addToQueueNext([track]);
        }}
        className="flex size-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white"
        title={t('player.addToQueue')}
      >
        <ListPlus size={15} />
      </button>
    </>
  );
}

export const LikesHero = React.memo(function LikesHero() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { tracks: likedTracks } = useLikedTracks();
  const [shuffleLoading, setShuffleLoading] = useState(false);

  const handleShuffleLikes = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shuffleLoading) return;

    if (!usePlayerStore.getState().shuffle) {
      usePlayerStore.setState({ shuffle: true });
    }

    const seen = new Set<string>();
    let started = false;

    if (likedTracks.length > 0) {
      for (const tr of likedTracks) seen.add(tr.urn);
      const random = likedTracks[Math.floor(Math.random() * likedTracks.length)];
      usePlayerStore.getState().play(random, likedTracks, LIKES_PLAYBACK);
      started = true;
    } else {
      setShuffleLoading(true);
    }

    try {
      await fetchAllLikedTracks(200, (page) => {
        const fresh = page.filter((tr) => !seen.has(tr.urn));
        for (const tr of fresh) seen.add(tr.urn);
        if (fresh.length === 0) return;

        if (!started) {
          const random = fresh[Math.floor(Math.random() * fresh.length)];
          usePlayerStore.getState().play(random, fresh, LIKES_PLAYBACK);
          started = true;
          setShuffleLoading(false);
        } else {
          usePlayerStore.getState().addToQueue(fresh);
        }
      });
    } finally {
      setShuffleLoading(false);
    }
  };

  if (!user) return null;

  return (
    <section className="relative h-[200px] max-w-xl rounded-md overflow-hidden p-6 flex flex-col justify-between border border-white/10 bg-[#0a0a0a]">
      <div>
        <div className="w-10 h-10 rounded-md bg-[#141414] border border-white/10 flex items-center justify-center mb-3 text-white">
          <Heart size={22} strokeWidth={1.75} className="fill-white/15" />
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{t('nav.likedTracks')}</h1>
        <p className="text-[13px] text-[#ffffff99] mt-1">
          {fc(user.public_favorites_count)} {t('search.tracks').toLowerCase()}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex -space-x-3">
          {likedTracks.slice(0, 4).map((track) => (
            <div
              key={track.id}
              className="w-10 h-10 rounded-full ring-2 ring-[#121214] bg-neutral-800 overflow-hidden relative z-[1]"
            >
              <img
                src={art(track.artwork_url, 'small') || ''}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleShuffleLikes}
          disabled={shuffleLoading}
          className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-contrast hover:brightness-110 transition-[filter] disabled:opacity-60"
        >
          {shuffleLoading ? (
            <Loader2 size={20} className="animate-spin text-accent" />
          ) : (
            <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />
          )}
        </button>
      </div>
    </section>
  );
});

export const LikedTracksList = React.memo(function LikedTracksList({
  filter,
}: {
  filter: string;
}) {
  const { t } = useTranslation();
  const { sort, cycleSort } = useTrackTableSort();
  const likesQuery = useLikedTracks();
  const { tracks: likedTracks, isLoading } = likesQuery;
  const sentinelRef = useInfiniteScroll(
    !!likesQuery.hasNextPage,
    !!likesQuery.isFetchingNextPage,
    likesQuery.fetchNextPage,
  );

  useEffect(() => {
    if (filter && likesQuery.hasNextPage && !likesQuery.isFetchingNextPage) {
      likesQuery.fetchNextPage();
    }
  }, [filter, likesQuery.hasNextPage, likesQuery.isFetchingNextPage, likesQuery.fetchNextPage]);

  const filtered = useMemo(() => {
    if (!filter) return likedTracks;
    const q = filter.toLowerCase();
    return likedTracks.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) || tr.user.username.toLowerCase().includes(q),
    );
  }, [likedTracks, filter]);

  const displayedTracks = useMemo(
    () => sortPlaylistTracks(filtered, sort),
    [filtered, sort],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-white/20" />
      </div>
    );
  }

  if (displayedTracks.length === 0) {
    return (
      <div className="py-20 text-center text-white/20">
        {filter && likesQuery.hasNextPage
          ? t('common.loading')
          : filter
            ? t('library.noMatches')
            : t('library.noLikedTracks')}
      </div>
    );
  }

  return (
    <TrackTableView
      tracks={displayedTracks}
      playbackContext={LIKES_PLAYBACK}
      sort={sort}
      onCycleSort={cycleSort}
      withActions
      renderRowActions={(track) => <LikesRowActions track={track} />}
      listDisabled={displayedTracks.length < 40}
      footer={
        !filter || likesQuery.isFetchingNextPage ? (
          <div ref={sentinelRef} className="mt-4 flex h-12 items-center justify-center">
            {likesQuery.isFetchingNextPage && (
              <Loader2 size={20} className="animate-spin text-white/15" />
            )}
          </div>
        ) : undefined
      }
    />
  );
});

export const LikesFilterInput = React.memo(function LikesFilterInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex-1 min-w-[200px] max-w-[320px]">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <SearchIcon size={15} className="text-[#ffffff99]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('library.filter')}
        className="w-full bg-[#141414] text-white placeholder:text-[#ffffff99] text-[13px] py-2 pl-9 pr-8 rounded-md outline-none border border-white/10 focus:border-white/30 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-2 flex items-center text-[#ffffff99] hover:text-white cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});
