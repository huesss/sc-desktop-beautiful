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
  Shuffle,
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
  const heroArt = art(likedTracks[0]?.artwork_url, 't500x500');

  const handlePlayLikes = async (shuffle: boolean) => {
    if (shuffleLoading) return;
    if (shuffle && !usePlayerStore.getState().shuffle) {
      usePlayerStore.setState({ shuffle: true });
    }

    const seen = new Set<string>();
    let started = false;

    if (likedTracks.length > 0) {
      for (const tr of likedTracks) seen.add(tr.urn);
      const list = shuffle ? [...likedTracks] : likedTracks;
      if (shuffle) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      }
      usePlayerStore.getState().play(list[0], list, LIKES_PLAYBACK);
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
          const list = shuffle ? [...fresh] : fresh;
          if (shuffle) {
            for (let i = list.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [list[i], list[j]] = [list[j], list[i]];
            }
          }
          usePlayerStore.getState().play(list[0], list, LIKES_PLAYBACK);
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
    <section className="relative min-h-[280px] overflow-hidden rounded-lg border border-white/10">
      {heroArt ? (
        <img src={heroArt} alt="" className="absolute inset-0 size-full object-cover blur-3xl scale-110 opacity-35" />
      ) : (
        <div className="absolute inset-0 bg-[#141414]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-[#0a0a0a]/20" />

      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div className="flex items-end gap-5">
          <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#141414] shadow-2xl md:size-40">
            {heroArt ? (
              <img src={heroArt} alt="" className="size-full object-cover" />
            ) : (
              <Heart size={42} strokeWidth={1.5} className="fill-white/15 text-white" />
            )}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {t('library.likesType')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              {t('nav.likedTracks')}
            </h1>
            <p className="mt-2 text-[13px] text-white/55">
              {fc(user.public_favorites_count)} {t('search.tracks').toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handlePlayLikes(true)}
            disabled={shuffleLoading}
            className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            title={t('player.shuffle')}
          >
            {shuffleLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Shuffle size={20} />
            )}
          </button>
          <button
            type="button"
            onClick={() => void handlePlayLikes(false)}
            disabled={shuffleLoading}
            className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            {shuffleLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Play size={24} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            )}
          </button>
        </div>
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
      dateSource="liked_at"
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
    <div className="relative min-w-[200px] max-w-[360px] flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <SearchIcon size={15} className="text-[#ffffff99]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('library.filter')}
        className="w-full rounded-md border border-white/10 bg-[#141414] py-2.5 pl-9 pr-8 text-[13px] text-white outline-none transition-colors placeholder:text-[#ffffff99] focus:border-white/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-2 flex cursor-pointer items-center text-[#ffffff99] transition-colors hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});
