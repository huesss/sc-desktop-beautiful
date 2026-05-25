import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AddToPlaylistDialog } from '../components/music/AddToPlaylistDialog';
import { SoundWaveSimilarBlock } from '../components/music/soundwave';
import { TrackTitleArtist } from '../components/music/TrackTitleArtist';
import { api } from '../lib/api';
import { getCurrentTime, preloadTrack } from '../lib/audio';
import { downloadTrack } from '../lib/cache';
import { ago, art, dateFormatted, dur, durLong, fc } from '../lib/formatters';
import {
  type Comment,
  invalidateAllLikesCache,
  useInfiniteScroll,
  usePostComment,
  useRelatedTracks,
  useTrackComments,
  useTrackFavoriters,
} from '../lib/hooks';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Hash,
  Headphones,
  Heart,
  LinkIcon,
  ListPlus,
  Loader2,
  MessageCircle,
  Music,
  musicIcon14,
  pauseBlack11,
  pauseBlack22,
  pauseCurrent16,
  playBlack11,
  playBlack22,
  playCurrent16,
  Send,
} from '../lib/icons';
import { optimisticToggleLike, setLikedUrn, useLiked } from '../lib/likes';
import { getArtistDisplay, getDisplayTitle, getParticipants } from '../lib/track-display';
import { useTrackPlay } from '../lib/useTrackPlay';
import { useLyricsStore } from '../stores/lyrics';
import { type Track, usePlayerStore } from '../stores/player';

function parseTags(tagList?: string): string[] {
  if (!tagList) return [];
  const tags: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tagList))) {
    tags.push(m[1] || m[2]);
  }
  return tags;
}

const ArtistLinks = React.memo(function ArtistLinks({
  artists,
}: {
  artists: { id: string; name: string }[];
}) {
  const navigate = useNavigate();
  return (
    <>
      {artists.map((a, i) => (
        <React.Fragment key={a.id || a.name}>
          {i > 0 && ', '}
          <span
            className={
              a.id
                ? 'text-[#ffffff99] hover:text-[#ffffff99] cursor-pointer transition-colors'
                : undefined
            }
            onClick={a.id ? () => navigate(`/artist/${encodeURIComponent(a.id)}`) : undefined}
          >
            {a.name}
          </span>
        </React.Fragment>
      ))}
    </>
  );
});

const EngagementChip = React.memo(function EngagementChip({
  active,
  activeTone,
  icon,
  count,
  label,
  onClick,
}: {
  active: boolean;

  activeTone: 'accent' | 'emerald';
  icon: React.ReactNode;
  count: number;
  label: string;
  onClick: () => void;
}) {
  const tone = activeTone === 'accent' ? 'text-accent' : 'text-emerald-400';
  const toneBg =
    activeTone === 'accent'
      ? 'bg-accent/15 border-accent/25 '
      : 'bg-emerald-500/15 border-emerald-500/25';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-[12.5px] font-semibold tabular-nums transition-all duration-200 ease-[var(--ease-apple)] cursor-pointer border ${
        active
          ? `${toneBg} ${tone}`
          : 'bg-[#141414] border-white/10 text-[#ffffff99] hover:bg-white/5 hover:text-white hover:border-white/[0.1]'
      }`}
    >
      {icon}
      <span>{fc(count)}</span>
    </button>
  );
});

const LikeBtn = React.memo(({ trackUrn, count }: { trackUrn: string; count?: number }) => {
  const { t } = useTranslation();
  const liked = useLiked(trackUrn);
  const [localCount, setLocalCount] = useState(count ?? 0);
  const qc = useQueryClient();

  useEffect(() => {
    setLocalCount(count ?? 0);
  }, [count]);

  const toggle = async () => {
    const next = !liked;
    setLocalCount((c) => c + (next ? 1 : -1));
    const cachedTrack = qc.getQueryData<Track>(['track', trackUrn]);
    if (cachedTrack) optimisticToggleLike(qc, cachedTrack, next);
    else setLikedUrn(trackUrn, next);
    invalidateAllLikesCache();
    try {
      await api(`/likes/tracks/${encodeURIComponent(trackUrn)}`, {
        method: next ? 'POST' : 'DELETE',
      });
      qc.invalidateQueries({ queryKey: ['track', trackUrn, 'favoriters'] });
    } catch {
      setLocalCount((c) => c + (next ? -1 : 1));
      if (cachedTrack) optimisticToggleLike(qc, cachedTrack, !next);
      else setLikedUrn(trackUrn, !next);
    }
  };

  return (
    <EngagementChip
      active={liked}
      activeTone="accent"
      icon={<Heart size={14} fill={liked ? 'currentColor' : 'none'} />}
      count={localCount}
      label={t('track.likes')}
      onClick={toggle}
    />
  );
});



const IconAction = React.memo(function IconAction({
  icon,
  label,
  onClick,
  danger,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-[var(--ease-apple)] cursor-pointer';
  const tone = danger
    ? 'text-[#ffffff99] hover:text-red-400 hover:bg-red-500/10'
    : active
      ? 'text-accent bg-accent/15'
      : 'text-[#ffffff99] hover:text-white hover:bg-white/5';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${base} ${tone}`}
    >
      {icon}
    </button>
  );
});



const CopyIconAction = React.memo(function CopyIconAction({ url }: { url: string | undefined }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!url) return;
    try {
      const u = new URL(url);
      u.searchParams.delete('utm_medium');
      u.searchParams.delete('utm_campaign');
      u.searchParams.delete('utm_source');
      const clean = u.toString().replace(/\?$/, '');
      navigator.clipboard.writeText(clean);
    } catch {
      navigator.clipboard.writeText(url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? t('auth.copied') : t('auth.copyLink')}
      aria-label={copied ? t('auth.copied') : t('auth.copyLink')}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-[var(--ease-apple)] cursor-pointer ${
        copied
          ? 'text-emerald-400 bg-emerald-500/12'
          : 'text-[#ffffff99] hover:text-white hover:bg-white/5'
      }`}
    >
      {copied ? <Check size={16} /> : <LinkIcon size={16} />}
    </button>
  );
});



const CommentItem = React.memo(({ comment }: { comment: Comment }) => {
  const navigate = useNavigate();
  const avatar = art(comment.user.avatar_url, 'small');

  return (
    <div className="flex gap-3 group">
      <img
        src={avatar ?? ''}
        alt=""
        className="w-8 h-8 rounded-full shrink-0 ring-1 ring-white/10 mt-0.5 cursor-pointer hover:ring-white/[0.15] transition-all duration-150"
        onClick={() => navigate(`/user/${encodeURIComponent(comment.user.urn)}`)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-medium text-[#ffffff99] hover:text-white cursor-pointer transition-colors duration-150"
            onClick={() => navigate(`/user/${encodeURIComponent(comment.user.urn)}`)}
          >
            {comment.user.username}
          </span>
          {comment.timestamp != null && (
            <span className="text-[10px] text-white/20 tabular-nums flex items-center gap-0.5">
              <Clock size={9} />
              {durLong(comment.timestamp)}
            </span>
          )}
          <span className="text-[10px] text-white/15 ml-auto shrink-0">
            {ago(comment.created_at)}
          </span>
        </div>
        <p className="text-[13px] text-[#ffffff99] mt-0.5 leading-relaxed break-words">
          {comment.body}
        </p>
      </div>
    </div>
  );
});

const CommentForm = React.memo(({ trackUrn }: { trackUrn: string }) => {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const mutation = usePostComment(trackUrn);

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    const time = getCurrentTime();
    const ts = time > 0 ? Math.floor(time * 1000) : undefined;
    mutation.mutate({ body: text, timestamp: ts });
    setBody('');
  };

  return (
    <div className="flex gap-3 glass rounded-xl px-4 py-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t('track.addComment')}
        rows={2}
        className="flex-1 bg-transparent text-[13px] text-[#ffffff99] placeholder:text-white/20 outline-none resize-none leading-relaxed"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!body.trim() || mutation.isPending}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-accent hover:bg-accent/10 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-default self-end"
      >
        {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      </button>
    </div>
  );
});



const RelatedRow = React.memo(
  ({ track, queue }: { track: Track; queue: Track[] }) => {
    const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue);
    const cover = art(track.artwork_url, 't200x200');

    return (
      <div
        className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ease-[var(--ease-apple)] ${
          isThis ? '' : 'hover:bg-white/[.03]'
        }`}
        onMouseEnter={() => preloadTrack(track.urn)}
      >
        <div
          className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/10 cursor-pointer"
          onClick={togglePlay}
        >
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/[.03]">
              {musicIcon14}
            </div>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
              isThisPlaying
                ? 'bg-black/30 opacity-100'
                : 'opacity-0 group-hover:bg-black/30 group-hover:opacity-100'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
              {isThisPlaying ? pauseBlack11 : playBlack11}
            </div>
          </div>
        </div>

        <TrackTitleArtist track={track} size="sm" />

        <div className="text-right shrink-0">
          <p className="text-[10px] text-[#ffffff99] tabular-nums">{dur(track.duration)}</p>
          {track.playback_count != null && (
            <p className="text-[9px] text-white/15 mt-0.5 tabular-nums flex items-center gap-0.5 justify-end">
              <Headphones size={8} />
              {fc(track.playback_count)}
            </p>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => prev.track.urn === next.track.urn,
);



const DownloadButton = React.memo(({ track }: { track: Track }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await downloadTrack(track.urn, track.user.username, track.title);
      toast.success(t('track.downloaded'));
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'cancelled') return;
      console.error('Download failed:', e);
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title={t('track.download')}
      aria-label={t('track.download')}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#ffffff99] hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
    </button>
  );
});



export const TrackPage = React.memo(() => {
  const { urn } = useParams<{ urn: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [descExpanded, setDescExpanded] = useState(false);
  const openLyrics = useLyricsStore((s) => s.openPanel);

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', urn],
    queryFn: () => api<Track>(`/tracks/${encodeURIComponent(urn!)}`),
    enabled: !!urn,
    staleTime: 30_000,
  });

  const {
    comments,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: fetchingMoreComments,
    isLoading: commentsLoading,
  } = useTrackComments(urn);

  const commentsSentinel = useInfiniteScroll(
    hasMoreComments,
    fetchingMoreComments,
    fetchMoreComments,
  );

  const { data: relatedData, isLoading: relatedLoading } = useRelatedTracks(urn, 10);
  const { data: favoritersData } = useTrackFavoriters(urn, 12);

  const trackUrn = track?.urn;

  const isThis = usePlayerStore(
    (s) =>
      !!trackUrn &&
      s.currentTrack?.urn === trackUrn &&
      !!s.playbackContext &&
      s.playbackContext.kind === 'track',
  );
  const isThisPlaying = usePlayerStore(
    (s) =>
      !!trackUrn &&
      s.currentTrack?.urn === trackUrn &&
      s.isPlaying &&
      s.playbackContext?.kind === 'track',
  );

  const relatedTracks = useMemo(() => relatedData?.collection ?? [], [relatedData]);
  const favoriters = useMemo(() => favoritersData?.collection ?? [], [favoritersData]);

  if (isLoading || !track) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="text-white/15 animate-spin" />
      </div>
    );
  }

  const cover = art(track.artwork_url, 't500x500');
  const tags = parseTags(track.tag_list);
  const desc = track.description?.trim();
  const descLong = desc && desc.length > 200;

  const handlePlay = () => {
    const { play, pause, resume } = usePlayerStore.getState();
    if (isThisPlaying) pause();
    else if (isThis) resume();
    else
      play(
        track,
        relatedTracks.length > 0 ? [track, ...relatedTracks] : undefined,
        { kind: 'track' },
      );
  };

  return (
    <div className="px-5 py-4 pb-4 space-y-7">
      {}
      <section className="rounded-lg border border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-4 p-5">
          <div
            className="relative size-36 shrink-0 overflow-hidden rounded-md border border-white/10 cursor-pointer group/cover sm:size-44"
            onClick={handlePlay}
          >
            {cover ? (
              <img
                src={cover}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-apple)] group-hover/cover:scale-[1.04]"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-[#141414]">
                <Music size={40} className="text-[#ffffff99]" />
              </div>
            )}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                isThisPlaying
                  ? 'bg-black/30 opacity-100'
                  : 'bg-black/0 opacity-0 group-hover/cover:bg-black/30 group-hover/cover:opacity-100'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ease-[var(--ease-apple)] ${
                  isThisPlaying
                    ? 'bg-white scale-100'
                    : 'bg-white/90 scale-75 group-hover/cover:scale-100'
                }`}
              >
                {isThisPlaying ? pauseBlack22 : playBlack22}
              </div>
            </div>
          </div>

          {}
          <div className="flex-1 min-w-0 py-2">
            {track.genre && (
              <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-[#ffffff99] border border-white/10 mb-3 uppercase tracking-wider">
                {track.genre}
              </span>
            )}
            <h1 className="text-2xl font-bold text-white leading-tight mb-2 line-clamp-2">
              {getDisplayTitle(track)}
            </h1>

            {}
            {(() => {
              const artistDisplay = getArtistDisplay(track);
              const participants = getParticipants(track);
              const realArtistId = track.enrichment?.primary_artist?.id;
              const artistTarget =
                realArtistId && artistDisplay.verified
                  ? `/artist/${encodeURIComponent(realArtistId)}`
                  : `/user/${encodeURIComponent(track.user.urn)}`;
              return (
                <div className="mb-5">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group/artist"
                    onClick={() => navigate(artistTarget)}
                  >
                    {track.user.avatar_url && (
                      <img
                        src={art(track.user.avatar_url, 'small') ?? ''}
                        alt=""
                        className="w-6 h-6 rounded-full ring-1 ring-white/10 group-hover/artist:ring-white/[0.15] transition-all duration-150"
                      />
                    )}
                    <span className="text-[14px] text-[#ffffff99] group-hover/artist:text-[#ffffff99] transition-colors">
                      {artistDisplay.primary}
                    </span>
                    {artistDisplay.isEnriched && artistDisplay.verified && (
                      <span
                        className="text-[10px] uppercase tracking-wider text-emerald-400/70"
                        title={t('track.verifiedArtist', {
                          confidence: (artistDisplay.confidence ?? 0).toFixed(2),
                        })}
                      >
                        ✓
                      </span>
                    )}
                    {artistDisplay.isEnriched && !artistDisplay.verified && (
                      <span
                        className="text-[10px] uppercase tracking-wider text-amber-400/60"
                        title={t('track.unverifiedArtist', {
                          confidence: (artistDisplay.confidence ?? 0).toFixed(2),
                        })}
                      >
                        ?
                      </span>
                    )}
                    {artistDisplay.uploadKind && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-semibold ${
                          artistDisplay.uploadKind === 'original'
                            ? 'bg-emerald-500/15 text-emerald-400/80'
                            : artistDisplay.uploadKind === 'demo'
                              ? 'bg-sky-500/15 text-sky-400/80'
                              : artistDisplay.uploadKind === 'alt'
                                ? 'bg-violet-500/15 text-violet-400/80'
                                : 'bg-amber-500/12 text-amber-400/70'
                        }`}
                        title={t(`track.uploadKind.${artistDisplay.uploadKind}`)}
                      >
                        {t(`track.uploadKind.${artistDisplay.uploadKind}`)}
                      </span>
                    )}
                  </div>
                  {(artistDisplay.uploader || participants) && (
                    <div className="ml-8 mt-1 text-[12px] text-[#ffffff99]">
                      {participants && (
                        <span>
                          {participants.featured.length > 0 && (
                            <>
                              feat. <ArtistLinks artists={participants.featured} />
                            </>
                          )}
                          {participants.featured.length > 0 &&
                            participants.remixers.length > 0 &&
                            ' · '}
                          {participants.remixers.length > 0 && (
                            <>
                              <ArtistLinks artists={participants.remixers} /> Remix
                            </>
                          )}
                        </span>
                      )}
                      {participants && artistDisplay.uploader && <span> · </span>}
                      {artistDisplay.uploader && (
                        <span>
                          <Trans
                            i18nKey="track.uploadedBy"
                            values={{ name: artistDisplay.uploader }}
                            components={[
                              <span
                                key="uploader-link"
                                className="text-[#ffffff99] hover:text-[#ffffff99] cursor-pointer transition-colors"
                                onClick={() =>
                                  navigate(`/user/${encodeURIComponent(track.user.urn)}`)
                                }
                              />,
                            ]}
                          />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {}
            <div className="flex items-center gap-3 flex-wrap">
              {}
              <button
                type="button"
                onClick={handlePlay}
                className={`inline-flex items-center gap-2 pl-4 pr-5 h-10 rounded-md text-sm font-medium transition-colors cursor-pointer active:scale-[0.975] ${
                  isThisPlaying
                    ? 'bg-[#141414] border border-white/10 text-white hover:bg-white/5'
                    : 'btn-primary'
                }`}
              >
                {isThisPlaying ? pauseCurrent16 : playCurrent16}
                {isThisPlaying ? t('track.pause') : t('track.play')}
              </button>

              {}
              <div className="flex items-center gap-1.5">
                <LikeBtn
                  trackUrn={track.urn}
                  count={track.favoritings_count ?? track.likes_count}
                />
              </div>

              {}
              <div
                className="flex items-center gap-0.5 h-11 px-1.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <IconAction
                  icon={<Music size={16} />}
                  label={t('track.lyrics')}
                  onClick={() => openLyrics('lyrics')}
                />
                <span className="w-px h-5 bg-white/[0.08] mx-0.5" aria-hidden />
                <AddToPlaylistDialog trackUrns={[track.urn]}>
                  <button
                    type="button"
                    title={t('playlist.addToPlaylist')}
                    aria-label={t('playlist.addToPlaylist')}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#ffffff99] hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  >
                    <ListPlus size={16} />
                  </button>
                </AddToPlaylistDialog>
                <CopyIconAction url={track.permalink_url} />
                <DownloadButton track={track} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="flex items-center gap-5 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99]">
          <Headphones size={13} className="text-white/20" />
          <span className="tabular-nums font-medium">{fc(track.playback_count)}</span>
          <span className="text-white/15">{t('track.plays')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99]">
          <Heart size={13} className="text-white/20" />
          <span className="tabular-nums font-medium">
            {fc(track.favoritings_count ?? track.likes_count)}
          </span>
          <span className="text-white/15">{t('track.likes')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99]">
          <MessageCircle size={13} className="text-white/20" />
          <span className="tabular-nums font-medium">{fc(track.comment_count)}</span>
          <span className="text-white/15">{t('track.comments')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff99] ml-auto">
          <Clock size={12} />
          <span className="tabular-nums">{durLong(track.duration)}</span>
        </div>
      </section>

      {}
      <SoundWaveSimilarBlock trackUrn={track.urn} />

      {}
      <div className="grid grid-cols-[1fr_320px] gap-3">
        {}
        <div className="space-y-6 min-w-0">
          {}
          {desc && (
            <section className="glass rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-[#ffffff99] mb-3 flex items-center gap-2">
                {t('track.description')}
              </h3>
              <div
                className={`text-[13px] text-[#ffffff99] leading-relaxed whitespace-pre-wrap break-words ${
                  !descExpanded && descLong ? 'max-h-[120px] overflow-hidden relative' : ''
                }`}
              >
                {desc}
                {!descExpanded && descLong && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[rgb(18,18,20)] to-transparent" />
                )}
              </div>
              {descLong && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="flex items-center gap-1 mt-2 text-[11px] text-[#ffffff99] hover:text-[#ffffff99] transition-colors cursor-pointer"
                >
                  {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>
          )}

          {}
          {tags.length > 0 && (
            <section className="flex items-center gap-2 flex-wrap px-1">
              <Hash size={12} className="text-white/15" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff99] border border-white/10 hover:bg-white/5 hover:text-[#ffffff99] transition-all duration-150 cursor-default"
                >
                  {tag}
                </span>
              ))}
            </section>
          )}

          {}
          <section className="space-y-4">
            <h3 className="text-[13px] font-semibold text-[#ffffff99] flex items-center gap-2 px-1">
              <MessageCircle size={14} />
              {t('track.comments')}
              {track.comment_count != null && (
                <span className="text-white/20 font-normal tabular-nums">
                  ({fc(track.comment_count)})
                </span>
              )}
            </h3>

            <CommentForm trackUrn={track.urn} />

            {commentsLoading ? (
              <div className="flex justify-center py-5">
                <Loader2 size={18} className="text-white/15 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-5">
                <MessageCircle size={28} className="text-white/10 mx-auto mb-2" />
                <p className="text-[12px] text-white/20">{t('track.noComments')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} />
                ))}
                <div ref={commentsSentinel} className="h-4 flex items-center justify-center">
                  {fetchingMoreComments && (
                    <Loader2 size={14} className="text-white/15 animate-spin" />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {}
        <div className="space-y-6">
          {}
          <section
            className="glass rounded-lg p-4 cursor-pointer hover:bg-[#141414] transition-all duration-200 group/ac"
            onClick={() => navigate(`/user/${encodeURIComponent(track.user.urn)}`)}
          >
            <div className="flex items-center gap-3">
              <img
                src={art(track.user.avatar_url, 't200x200') ?? ''}
                alt=""
                className="w-12 h-12 rounded-full ring-1 ring-white/10 group-hover/ac:ring-white/[0.15] transition-all duration-150"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#ffffff99] truncate group-hover/ac:text-white transition-colors">
                  {track.user.username}
                </p>
              </div>
            </div>
          </section>

          {}
          <section className="flex items-center gap-2 text-[11px] text-[#ffffff99] px-1">
            <Calendar size={12} />
            <span>
              {t('track.posted')} {dateFormatted(track.created_at ?? '')}
            </span>
          </section>

          {}
          {favoriters.length > 0 && (
            <section className="glass rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-[#ffffff99] mb-3">
                {t('track.favoriters')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {favoriters.map((u) => (
                  <img
                    key={u.urn}
                    src={art(u.avatar_url, 'small') ?? ''}
                    alt={u.username}
                    title={u.username}
                    className="w-8 h-8 rounded-full ring-1 ring-white/10 hover:ring-white/[0.15] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate(`/user/${encodeURIComponent(u.urn)}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {}
          <section>
            <h3 className="text-[13px] font-semibold text-[#ffffff99] mb-3 flex items-center gap-2 px-1">
              <Music size={14} />
              {t('track.related')}
            </h3>
            {relatedLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="text-white/15 animate-spin" />
              </div>
            ) : relatedTracks.length === 0 ? (
              <p className="text-[12px] text-white/20 px-1">No related tracks</p>
            ) : (
              <div className="space-y-1">
                {relatedTracks.map((rt) => (
                  <RelatedRow key={rt.urn} track={rt} queue={relatedTracks} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
});
