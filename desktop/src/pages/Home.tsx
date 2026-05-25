import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FeedShuffleShelf,
  LikedPlaylistsShelf,
  QuickAccessGrid,
  RecommendedPlaylistsShelf,
  StaggeredPlaylistShelves,
} from '../components/home';
import { LikeButton } from '../components/music/LikeButton';
import { TrackCard } from '../components/music/TrackCard';
import { TrackTitleArtist } from '../components/music/TrackTitleArtist';
import { UploadKindDot } from '../components/music/UploadKindDot';
import { HorizontalScroll } from '../components/ui/HorizontalScroll';
import { Skeleton } from '../components/ui/Skeleton';
import { preloadTrack } from '../lib/audio';
import { ago, art, dur, fc } from '../lib/formatters';
import type { FeedItem, Playlist, SCUser } from '../lib/hooks';
import {
  useFeatured,
  useFeed,
  useFollowingTracks,
  useInfiniteScroll,
  useLikedTracks,
  useMyLikedPlaylists,
  useMyPlaylists,
} from '../lib/hooks';
import {
  ChevronRight,
  Headphones,
  Heart,
  headphones9,
  heart9,
  ListMusic,
  Loader2,
  listMusic8,
  listMusic9,
  Music,
  musicIcon22,
  pauseBlack14,
  pauseBlack18,
  pauseBlack22,
  playBlack14,
  playBlack18,
  playBlack22,
  Repeat2,
} from '../lib/icons';
import { getArtistTarget, useArtistDisplay, useDisplayTitle } from '../lib/track-display';
import { useAutoHide } from '../lib/useAutoHide';
import type { PlaybackContext } from '../lib/playback-context';
import { usePlaybackInContext } from '../lib/playback-context';
import { useTrackPlay } from '../lib/useTrackPlay';
import { useAuthStore } from '../stores/auth';
import type { Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';



function greetingKey() {
  const h = new Date().getHours();
  if (h < 6) return 'home.goodNight';
  if (h < 12) return 'home.goodMorning';
  if (h < 18) return 'home.goodAfternoon';
  return 'home.goodEvening';
}



function SectionHeader({
  title,
  icon,
  onSeeAll,
}: {
  title: string;
  icon: React.ReactNode;
  onSeeAll?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[#141414] border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-1 text-[11px] text-[#ffffff99] hover:text-[#ffffff99] transition-colors duration-200 cursor-pointer"
        >
          {t('common.seeAll')}
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}



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

function FeaturedSkeleton() {
  return (
    <div className="border border-white/10 bg-[#0a0a0a] rounded-lg px-4 py-3 flex items-center gap-3">
      <Skeleton className="w-[160px] h-[160px] shrink-0" rounded="lg" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-3/4" rounded="sm" />
        <Skeleton className="h-4 w-1/3" rounded="sm" />
        <div className="pt-3" />
        <Skeleton className="h-3 w-1/2" rounded="sm" />
      </div>
      <Skeleton className="w-14 h-14 shrink-0" rounded="full" />
    </div>
  );
}

function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/[.03] p-3 flex items-center gap-3.5">
          <Skeleton className="w-[76px] h-[76px] shrink-0" rounded="lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" rounded="sm" />
            <Skeleton className="h-3 w-1/2" rounded="sm" />
            <Skeleton className="h-2.5 w-2/5" rounded="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}



const FeaturedCard = React.memo(
  function FeaturedCard({ item, queue }: { item: FeedItem; queue: Track[] }) {
    const { t } = useTranslation();
    const track = item.origin as Track;
    const { isThisPlaying, togglePlay } = useTrackPlay(track, queue);
    const showPlayingOverlay = useAutoHide(isThisPlaying);
    const navigate = useNavigate();
    const isRepost = item.type.includes('repost');
    const cover = art(track.artwork_url);
    const avatar = art(track.user.avatar_url, 'small');

    return (
      <div
        className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] select-none"
        onMouseEnter={() => preloadTrack(track.urn)}
      >
        <div className="relative flex items-center gap-2 px-4 py-3">
          <div
            className="relative size-20 shrink-0 overflow-hidden rounded-md border border-white/10 cursor-pointer group/cover"
            onClick={togglePlay}
          >
            {cover ? (
              <img
                src={cover}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-apple)] group-hover/cover:scale-[1.05]"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#141414]">
                <Music size={40} className="text-white/15" />
              </div>
            )}

            {}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 group-hover/cover:bg-black/30 group-hover/cover:opacity-100 ${
                showPlayingOverlay ? 'bg-black/30 opacity-100' : 'bg-black/0 opacity-0'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ease-[var(--ease-apple)] group-hover/cover:scale-100 ${
                  showPlayingOverlay ? 'bg-white scale-100' : 'bg-white/90 scale-75'
                }`}
              >
                {isThisPlaying ? pauseBlack18 : playBlack18}
              </div>
            </div>
          </div>

          {}
          <div className="flex-1 min-w-0 py-1">
            {isRepost && (
              <div className="flex items-center gap-1.5 mb-2.5 text-[11px] text-[#ffffff99] font-medium">
                <Repeat2 size={11} />
                <span>{t('home.reposted')}</span>
                <span className="text-white/15">·</span>
                <span>{ago(item.created_at)}</span>
              </div>
            )}

            <FeaturedTitleArtist track={track} avatar={avatar} navigate={navigate} />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {track.genre && (
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-[#ffffff99] border border-white/10">
                  {track.genre}
                </span>
              )}
              <div className="flex items-center gap-3 text-[11px] text-[#ffffff99] tabular-nums">
                <span className="flex items-center gap-1">
                  <Headphones size={11} />
                  {fc(track.playback_count)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={11} />
                  {fc(track.favoritings_count ?? track.likes_count)}
                </span>
                <span>{dur(track.duration)}</span>
                {!isRepost && <span>{ago(item.created_at)}</span>}
              </div>
            </div>
          </div>

          {}
          <button
            type="button"
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ease-[var(--ease-apple)] shadow-xl cursor-pointer ${
              isThisPlaying
                ? 'bg-white scale-100'
                : 'bg-white/90 hover:bg-white hover:scale-105 active:scale-95'
            }`}
          >
            {isThisPlaying ? pauseBlack22 : playBlack22}
          </button>
        </div>
      </div>
    );
  },
  (prev, next) => prev.item.origin.urn === next.item.origin.urn,
);

const FeaturedTitleArtist = React.memo(function FeaturedTitleArtist({
  track,
  avatar,
  navigate,
}: {
  track: Track;
  avatar: string | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const artistDisplay = useArtistDisplay(track);
  const displayTitle = useDisplayTitle(track);
  const artistTarget = getArtistTarget(track);
  return (
    <>
      <h2
        className="text-xl font-bold text-white truncate leading-tight cursor-pointer hover:text-white transition-colors duration-200"
        onClick={() => navigate(`/track/${encodeURIComponent(track.urn)}`)}
      >
        {displayTitle}
      </h2>
      <div
        className="flex items-center gap-2 mt-2 cursor-pointer group/artist"
        onClick={artistTarget ? () => navigate(artistTarget) : undefined}
      >
        {avatar && (
          <img
            src={avatar}
            alt=""
            className="w-5 h-5 rounded-full ring-1 ring-white/10 group-hover/artist:ring-white/[0.15] transition-all duration-150"
            decoding="async"
          />
        )}
        <UploadKindDot kind={artistDisplay.uploadKind} />
        <p className="text-[13px] text-[#ffffff99] truncate group-hover/artist:text-[#ffffff99] transition-colors duration-150">
          {artistDisplay.primary}
        </p>
      </div>
    </>
  );
});



const FeedTrackCard = React.memo(
  function FeedTrackCard({ item, queue }: { item: FeedItem; queue: Track[] }) {
    const { t } = useTranslation();
    const track = item.origin as Track;
    const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue);
    const showPlayingOverlay = useAutoHide(isThisPlaying);
    const isRepost = item.type.includes('repost');
    const cover = art(track.artwork_url, 't300x300');

    return (
      <div
        className={`group rounded-lg border border-white/10 bg-white/[.03] p-3 flex items-center gap-2 transition-colors select-none ${
          isThis ? 'bg-[#141414]' : 'hover:bg-[#141414]'
        }`}
        onMouseEnter={() => preloadTrack(track.urn)}
      >
        {}
        <div
          className="relative w-[76px] h-[76px] rounded-md overflow-hidden shrink-0 border border-white/10 cursor-pointer"
          onClick={togglePlay}
        >
          {cover ? (
            <img
              src={cover}
              alt={track.title}
              className="w-full h-full object-cover"
              decoding="async"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#141414]">
              {musicIcon22}
            </div>
          )}

          {}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100 ${
              showPlayingOverlay ? 'bg-black/30 opacity-100' : 'bg-black/0 opacity-0'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ease-[var(--ease-apple)] group-hover:scale-100 ${
                showPlayingOverlay ? 'bg-white scale-100' : 'bg-white/90 scale-75'
              }`}
            >
              {isThisPlaying ? pauseBlack14 : playBlack14}
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 min-w-0">
          {isRepost && (
            <div className="flex items-center gap-1 mb-1 text-[10px] text-white/20 font-medium">
              <Repeat2 size={9} />
              <span>{t('home.reposted')}</span>
            </div>
          )}
          <TrackTitleArtist track={track} highlight={isThis} size="sm" className="" />
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/20 tabular-nums">
            {track.genre && (
              <span className="px-1.5 py-px rounded-full bg-[#141414] text-[#ffffff99] border border-white/10 text-[9px]">
                {track.genre}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              {headphones9}
              {fc(track.playback_count)}
            </span>
            <span className="flex items-center gap-0.5">
              {heart9}
              {fc(track.favoritings_count ?? track.likes_count)}
            </span>
          </div>
        </div>

        {}
        <LikeButton track={track} />

        {}
        <div className="text-right shrink-0 self-center">
          <p className="text-[11px] text-[#ffffff99] tabular-nums font-medium">
            {dur(track.duration)}
          </p>
          <p className="text-[10px] text-white/15 mt-0.5">{ago(item.created_at)}</p>
        </div>
      </div>
    );
  },
  (prev, next) => prev.item.origin.urn === next.item.origin.urn,
);



const FeedPlaylistCard = React.memo(
  function FeedPlaylistCard({ item }: { item: FeedItem }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const origin = item.origin;
    const isRepost = item.type.includes('repost');
    const cover =
      art(origin.artwork_url, 't300x300') ?? art(origin.tracks?.[0]?.artwork_url, 't300x300');

    
    const trackUrns = useMemo(
      () => new Set((origin.tracks ?? []).map((t: Track) => t.urn)),
      [origin.tracks],
    );
    const playlistCtx: PlaybackContext = { kind: 'playlist', urn: origin.urn };
    const { isPausedFromThis, isPlayingFromThis } = usePlaybackInContext(playlistCtx, trackUrns);

    const handlePlay = async (e: React.MouseEvent) => {
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

      if (origin.tracks && origin.tracks.length > 0) {
        play(origin.tracks[0], origin.tracks, playlistCtx);
        return;
      }

      setLoading(true);
      try {
        const data = await import('../lib/api').then((m) =>
          m.api<{ collection: Track[] }>(`/playlists/${encodeURIComponent(origin.urn)}/tracks`),
        );
        const tracks = data.collection;
        if (tracks.length > 0) {
          play(tracks[0], tracks, playlistCtx);
        }
      } catch {
        navigate(`/playlist/${encodeURIComponent(origin.urn)}`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div
        className={`group rounded-lg border border-white/10 bg-white/[.03] p-3 flex items-center gap-2 transition-colors select-none ${
          isPlayingFromThis ? 'bg-[#141414]' : 'hover:bg-[#141414]'
        }`}
      >
        {}
        <div
          className="relative w-[76px] h-[76px] rounded-md overflow-hidden shrink-0 border border-white/10 cursor-pointer"
          onClick={handlePlay}
        >
          {cover ? (
            <img
              src={cover}
              alt={origin.title}
              className="w-full h-full object-cover"
              decoding="async"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#141414]">
              <ListMusic size={22} className="text-white/15" />
            </div>
          )}

          {}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
              isPlayingFromThis
                ? 'bg-black/30 opacity-100'
                : 'bg-black/0 opacity-0 group-hover:bg-black/30 group-hover:opacity-100'
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ease-[var(--ease-apple)] ${
                  isPlayingFromThis
                    ? 'bg-white scale-100'
                    : 'bg-white/90 scale-75 group-hover:scale-100'
                }`}
              >
                {isPlayingFromThis ? pauseBlack14 : playBlack14}
              </div>
            )}
          </div>

          {}
          {origin.track_count != null && (
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-medium bg-black/50 text-[#ffffff99] px-1.5 py-0.5 rounded-full">
              {listMusic8}
              {origin.track_count}
            </div>
          )}
        </div>

        {}
        <div className="flex-1 min-w-0">
          {isRepost && (
            <div className="flex items-center gap-1 mb-1 text-[10px] text-white/20 font-medium">
              <Repeat2 size={9} />
              <span>{t('home.reposted')}</span>
            </div>
          )}
          <p
            className="text-[13px] font-medium text-white truncate leading-snug cursor-pointer hover:text-white transition-colors duration-150"
            onClick={() => navigate(`/playlist/${encodeURIComponent(origin.urn)}`)}
          >
            {origin.title}
          </p>
          <p
            className="text-[11px] text-[#ffffff99] truncate mt-0.5 cursor-pointer hover:text-[#ffffff99] transition-colors duration-150"
            onClick={() =>
              origin.user?.urn && navigate(`/user/${encodeURIComponent(origin.user.urn)}`)
            }
          >
            {origin.user?.username}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/20">
            <span className="flex items-center gap-0.5">
              {listMusic9}
              {origin.track_count ?? 0} {t('search.tracks').toLowerCase()}
            </span>
          </div>
        </div>

        {}
        <div className="text-right shrink-0 self-center">
          <p className="text-[10px] text-white/15">{ago(item.created_at)}</p>
        </div>
      </div>
    );
  },
  (prev, next) => prev.item.origin.urn === next.item.origin.urn,
);



const FeaturedPlaylistHero = React.memo(function FeaturedPlaylistHero({
  playlist,
}: {
  playlist: Playlist;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const trackUrns = useMemo(
    () => new Set((playlist?.tracks ?? []).map((t: Track) => t.urn)),
    [playlist?.tracks],
  );
  const featuredCtx: PlaybackContext = { kind: 'playlist', urn: playlist.urn };
  const { isPausedFromThis, isPlayingFromThis } = usePlaybackInContext(featuredCtx, trackUrns);

  const cover = art(playlist.artwork_url) ?? art(playlist.tracks?.[0]?.artwork_url);

  const handlePlay = async () => {
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
      play(playlist.tracks[0], playlist.tracks, featuredCtx);
      return;
    }

    setLoading(true);
    try {
      const data = await import('../lib/api').then((m) =>
        m.api<{ collection: Track[] }>(`/playlists/${encodeURIComponent(playlist.urn)}/tracks`),
      );
      if (data.collection.length > 0) {
        usePlayerStore.getState().play(data.collection[0], data.collection, featuredCtx);
      }
    } catch {
      navigate(`/playlist/${encodeURIComponent(playlist.urn)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] select-none">
      <div className="relative flex items-center gap-3 px-4 py-3">
        <div
          className="relative w-[160px] h-[160px] rounded-md overflow-hidden shrink-0 border border-white/10 cursor-pointer group/cover"
          onClick={handlePlay}
        >
          {cover ? (
            <img
              src={cover}
              alt={playlist.title}
              className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-apple)] group-hover/cover:scale-[1.05]"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#141414]">
              <ListMusic size={40} className="text-white/15" />
            </div>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isPlayingFromThis ? 'bg-black/30 opacity-100' : 'bg-black/0 opacity-0 group-hover/cover:bg-black/30 group-hover/cover:opacity-100'}`}
          >
            {loading ? (
              <Loader2 size={24} className="text-white animate-spin" />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ease-[var(--ease-apple)] ${isPlayingFromThis ? 'bg-white scale-100' : 'bg-white/90 scale-75 group-hover/cover:scale-100'}`}
              >
                {isPlayingFromThis ? pauseBlack18 : playBlack18}
              </div>
            )}
          </div>
          {playlist.track_count != null && (
            <div className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] font-medium bg-black/50 text-[#ffffff99] px-2 py-0.5 rounded-full">
              <ListMusic size={10} />
              {playlist.track_count}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-center gap-1.5 mb-2.5 text-[11px] text-[#ffffff99] font-medium">
            <ListMusic size={11} />
            <span>{t('search.playlists')}</span>
          </div>

          <h2
            className="text-xl font-bold text-white truncate leading-tight cursor-pointer hover:text-white transition-colors duration-200"
            onClick={() => navigate(`/playlist/${encodeURIComponent(playlist.urn)}`)}
          >
            {playlist.title}
          </h2>

          {playlist.user && (
            <div
              className="flex items-center gap-2 mt-2 cursor-pointer group/artist"
              onClick={() => navigate(`/user/${encodeURIComponent(playlist.user.urn)}`)}
            >
              {playlist.user.avatar_url && (
                <img
                  src={art(playlist.user.avatar_url, 'small')!}
                  alt=""
                  className="w-5 h-5 rounded-full ring-1 ring-white/10 group-hover/artist:ring-white/[0.15] transition-all duration-150"
                  decoding="async"
                />
              )}
              <p className="text-[13px] text-[#ffffff99] truncate group-hover/artist:text-[#ffffff99] transition-colors duration-150">
                {playlist.user.username}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4 text-[11px] text-[#ffffff99] tabular-nums">
            {playlist.genre && (
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-[#ffffff99] border border-white/10">
                {playlist.genre}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ListMusic size={11} />
              {playlist.track_count ?? 0} {t('search.tracks').toLowerCase()}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={11} />
              {fc(playlist.likes_count)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlay}
          className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ease-[var(--ease-apple)] shadow-xl cursor-pointer ${isPlayingFromThis ? 'bg-white scale-100' : 'bg-white/90 hover:bg-white hover:scale-105 active:scale-95'}`}
        >
          {loading ? (
            <Loader2 size={22} className="text-black animate-spin" />
          ) : isPlayingFromThis ? (
            pauseBlack22
          ) : (
            playBlack22
          )}
        </button>
      </div>
    </div>
  );
});



const FeaturedUserHero = React.memo(function FeaturedUserHero({ user }: { user: SCUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const avatar = art(user.avatar_url);

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] select-none cursor-pointer hover:bg-[#141414] transition-colors"
      onClick={() => navigate(`/user/${encodeURIComponent(user.urn)}`)}
    >
      <div className="relative flex items-center gap-3 px-4 py-3">
        <div className="w-[160px] h-[160px] rounded-full overflow-hidden shrink-0 border border-white/10">
          {avatar ? (
            <img
              src={avatar}
              alt={user.username}
              className="w-full h-full object-cover"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#141414]">
              <Music size={40} className="text-white/15" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-1">
          <h2 className="text-xl font-bold text-white truncate leading-tight group-hover:text-white transition-colors duration-200">
            {user.username}
          </h2>

          {(user.city || user.country) && (
            <p className="text-[13px] text-[#ffffff99] mt-1.5">
              {[user.city, user.country].filter(Boolean).join(', ')}
            </p>
          )}

          <div className="flex items-center gap-2 mt-4 text-[11px] text-[#ffffff99] tabular-nums">
            {user.followers_count != null && (
              <span>
                {fc(user.followers_count)} {t('user.followers')}
              </span>
            )}
            {user.track_count != null && (
              <span>
                {fc(user.track_count)} {t('search.tracks').toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={28}
          className="text-white/20 shrink-0 group-hover:text-[#ffffff99] transition-colors"
        />
      </div>
    </div>
  );
});



const FeaturedHero = React.memo(function FeaturedHero({
  featuredItem,
  feedTrackQueue,
  isLoading,
}: {
  featuredItem: FeedItem | undefined;
  feedTrackQueue: Track[];
  isLoading: boolean;
}) {
  const { data: featured, isLoading: featuredLoading } = useFeatured();

  if (featuredLoading || isLoading) return <FeaturedSkeleton />;

  if (featured) {
    if (featured.type === 'track') {
      const track = featured.data as Track | null;
      if (track?.urn) {
        return (
          <section>
            <FeaturedCard
              item={{ type: 'track', created_at: '', origin: track }}
              queue={[track]}
            />
          </section>
        );
      }
    }
    if (featured.type === 'playlist') {
      const playlist = featured.data as Playlist | null;
      if (playlist?.urn) {
        return (
          <section>
            <FeaturedPlaylistHero playlist={playlist} />
          </section>
        );
      }
    }
    if (featured.type === 'user') {
      const user = featured.data as SCUser | null;
      if (user?.urn) {
        return (
          <section>
            <FeaturedUserHero user={user} />
          </section>
        );
      }
    }
  }

  
  if (!featuredItem) return null;
  return (
    <section>
      <FeaturedCard item={featuredItem} queue={feedTrackQueue} />
    </section>
  );
});

const LikedShelf = React.memo(function LikedShelf({
  likedTracks,
  isLoading,
}: {
  likedTracks: Track[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isLoading && likedTracks.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title={t('library.likedTracks')}
          icon={<Heart size={15} className="text-accent" />}
        onSeeAll={() => navigate('/likes')}
      />
      <HorizontalScroll>
        {isLoading ? (
          <ShelfSkeleton />
        ) : (
          likedTracks.map((track) => (
            <div key={track.urn} className="w-[180px] shrink-0">
              <TrackCard
                track={track}
                queue={likedTracks}
                playbackContext={{ kind: 'likes' }}
              />
            </div>
          ))
        )}
      </HorizontalScroll>
    </section>
  );
});

const FollowingShelf = React.memo(function FollowingShelf({
  followingTracks,
  isLoading,
}: {
  followingTracks: Track[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  if (!isLoading && followingTracks.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title={t('home.freshReleases')}
        icon={<Music size={15} className="text-[#ffffff99]" />}
      />
      <HorizontalScroll>
        {isLoading ? (
          <ShelfSkeleton />
        ) : (
          followingTracks.map((track) => (
            <div key={track.urn} className="w-[180px] shrink-0">
              <TrackCard track={track} queue={followingTracks} />
            </div>
          ))
        )}
      </HorizontalScroll>
    </section>
  );
});

const FeedStream = React.memo(function FeedStream({
  feedItems,
  featuredItem,
  feedTrackQueue,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
}: {
  feedItems: FeedItem[];
  featuredItem: FeedItem | undefined;
  feedTrackQueue: Track[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const sentinelRef = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage);

  const streamItems = useMemo(
    () => feedItems.filter((i) => i !== featuredItem),
    [feedItems, featuredItem],
  );

  return (
    <section>
      <SectionHeader
        title={t('home.yourFeed')}
        icon={<Music size={15} className="text-[#ffffff99]" />}
      />

      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-2.5">
          {streamItems.map((item) => (
            <div
              key={item.origin.urn}
              style={{
                contentVisibility: 'auto',
                contain: 'layout paint style',
                containIntrinsicSize: '380px 110px',
              }}
            >
              {item.type.includes('track') ? (
                <FeedTrackCard item={item} queue={feedTrackQueue} />
              ) : (
                <FeedPlaylistCard item={item} />
              )}
            </div>
          ))}
        </div>
      )}

      {}
      <div ref={sentinelRef} className="h-12 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 size={18} className="text-white/15 animate-spin" />}
        {!isLoading && !hasNextPage && !isFetchingNextPage && streamItems.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-white/15">
            <div className="h-px w-8 bg-white/[0.06]" />
            <span>{t('home.endOfFeed')}</span>
            <div className="h-px w-8 bg-white/[0.06]" />
          </div>
        )}
      </div>
    </section>
  );
});



export function Home() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const feedQuery = useFeed();
  const likedTracksQuery = useLikedTracks(100);
  const followingQuery = useFollowingTracks(20);
  const likedPlaylistsQuery = useMyLikedPlaylists(24);
  const myPlaylistsQuery = useMyPlaylists(24);

  const featuredItem = useMemo(
    () => feedQuery.items.find((item) => item.type.includes('track')),
    [feedQuery.items],
  );
  const feedTrackQueue = useMemo(
    () =>
      feedQuery.items
        .filter((item) => item.type.includes('track'))
        .map((item) => item.origin as Track),
    [feedQuery.items],
  );
  const followingTracks = useMemo(
    () => followingQuery.data?.collection ?? [],
    [followingQuery.data],
  );
  const likedShelfTracks = useMemo(
    () => likedTracksQuery.tracks.slice(0, 50),
    [likedTracksQuery.tracks],
  );
  const likedCover = useMemo(
    () => art(likedShelfTracks[0]?.artwork_url, 't200x200') ?? null,
    [likedShelfTracks],
  );

  return (
    <div className="px-5 py-4 pb-4 space-y-8">
      <section className="pt-1">
        <h1 className="hero-greeting text-[32px] font-bold tracking-tight leading-tight">
          {t(greetingKey())}
          {user?.username ? `, ${user.username}` : ''}
        </h1>
      </section>

      <QuickAccessGrid
        feedTracks={feedTrackQueue}
        likedCover={likedCover}
        likedPlaylists={likedPlaylistsQuery.playlists}
        myPlaylists={myPlaylistsQuery.playlists}
      />
      <RecommendedPlaylistsShelf
        feedItems={feedQuery.items}
        feedLoading={feedQuery.isLoading}
        likedPlaylists={likedPlaylistsQuery.playlists}
        myPlaylists={myPlaylistsQuery.playlists}
        playlistsLoading={likedPlaylistsQuery.isLoading || myPlaylistsQuery.isLoading}
      />
      <StaggeredPlaylistShelves />
      <LikedPlaylistsShelf
        playlists={likedPlaylistsQuery.playlists}
        isLoading={likedPlaylistsQuery.isLoading}
      />
      <LikedShelf likedTracks={likedShelfTracks} isLoading={likedTracksQuery.isLoading} />
      <FollowingShelf followingTracks={followingTracks} isLoading={followingQuery.isLoading} />
      <FeedShuffleShelf feedItems={feedQuery.items} isLoading={feedQuery.isLoading} />
      <FeaturedHero
        featuredItem={featuredItem}
        feedTrackQueue={feedTrackQueue}
        isLoading={feedQuery.isLoading}
      />
      <FeedStream
        feedItems={feedQuery.items}
        featuredItem={featuredItem}
        feedTrackQueue={feedTrackQueue}
        fetchNextPage={feedQuery.fetchNextPage}
        hasNextPage={feedQuery.hasNextPage}
        isFetchingNextPage={feedQuery.isFetchingNextPage}
        isLoading={feedQuery.isLoading}
      />
    </div>
  );
}
