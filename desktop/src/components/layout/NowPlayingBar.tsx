import * as Slider from '@radix-ui/react-slider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { api } from '../../lib/api';
import { getCurrentTime, getDuration, handlePrev, seek, subscribe } from '../../lib/audio';
import { art, formatTime } from '../../lib/formatters';
import { invalidateAllLikesCache } from '../../lib/hooks';
import {
  Check,
  Heart,
  MicVocal,
  listMusic14,
  pauseBlack16,
  playBlack16,
  repeat1Icon14,
  repeatIcon14,
  shuffleIcon14,
  skipBack16,
  skipForward16,
  volume1Icon14,
  volume2Icon14,
  volumeXIcon14,
} from '../../lib/icons';
import { optimisticToggleLike, useLiked } from '../../lib/likes';
import { isVibeRoute, triggerVibeLikeFlash } from '../../lib/vibe-like-flash';
import { useArtistDisplay, useDisplayTitle } from '../../lib/track-display';
import { useLyricsStore } from '../../stores/lyrics';
import { type Track, usePlayerStore } from '../../stores/player';
import { UploadKindDot } from '../music/UploadKindDot';



const DownloadProgressPanel = React.memo(() => {
  const downloadProgress = usePlayerStore((s) => s.downloadProgress);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef<number | null>(null);
  const [visibleProgress, setVisibleProgress] = useState<number | null>(null);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (downloadProgress === null || downloadProgress >= 1) {
      if (lastProgressRef.current !== null && lastProgressRef.current > 0 && lastProgressRef.current < 1) {
        hideTimerRef.current = setTimeout(() => {
          setVisibleProgress(null);
          hideTimerRef.current = null;
        }, 260);
      } else {
        setVisibleProgress(null);
      }
      lastProgressRef.current = downloadProgress;
      return;
    }

    if (downloadProgress <= 0) {
      setVisibleProgress(null);
      return;
    }

    lastProgressRef.current = downloadProgress;
    setVisibleProgress(downloadProgress);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [downloadProgress]);

  if (visibleProgress === null) return null;

  const normalizedProgress = Math.max(0, Math.min(1, visibleProgress));
  const progressPercent =
    normalizedProgress >= 1 ? 100 : Math.min(99, Math.round(normalizedProgress * 100));

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[calc(100%+8px)]">
      <div
        className="flex min-w-[148px] items-center gap-2 rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2"
        style={{ contain: 'strict', transform: 'translateZ(0)' }}
      >
        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.09]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="min-w-[34px] text-right text-[11px] font-semibold tabular-nums text-white/72">
          {progressPercent}%
        </div>
      </div>
    </div>
  );
});



export const ProgressSlider = React.memo(() => {
  const duration = useSyncExternalStore(subscribe, getDuration);

  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [syncedValue, setSyncedValue] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [hovering, setHovering] = useState(false);

  const draggingRef = useRef(false);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    return subscribe(() => {
      if (draggingRef.current) return;
      const t = getCurrentTime();
      const d = getDuration();
      const pct = d > 0 ? (t / d) * 100 : 0;
      if (rangeRef.current) rangeRef.current.style.right = `${100 - pct}%`;
      const thumbWrapper = thumbRef.current?.parentElement;
      if (thumbWrapper) thumbWrapper.style.left = `${pct}%`;
    });
  }, []);

  const displayValue = dragging ? dragValue : syncedValue;

  
  
  const pendingCommitRef = useRef<number | null>(null);

  const onValueChange = useCallback(([v]: number[]) => {
    setDragValue(v);
    pendingCommitRef.current = v;
    if (!draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);

      const resetDrag = () => {
        window.removeEventListener('pointerup', resetDrag);
        window.removeEventListener('pointercancel', resetDrag);
        
        requestAnimationFrame(() => {
          if (draggingRef.current) {
            const val = pendingCommitRef.current;
            if (val != null) seek(val);
            draggingRef.current = false;
            setDragging(false);
            setSyncedValue(val ?? 0);
          }
        });
      };
      window.addEventListener('pointerup', resetDrag);
      window.addEventListener('pointercancel', resetDrag);
    }
  }, []);

  const onValueCommit = useCallback(([v]: number[]) => {
    seek(v);
    draggingRef.current = false;
    pendingCommitRef.current = null;
    setDragging(false);
    setSyncedValue(v);
  }, []);

  const updateHoverFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      const d = getDuration();
      if (!el || d <= 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHoverPct(ratio * 100);
      setHoverTime(ratio * d);
    },
    [],
  );

  const previewSeconds = dragging ? dragValue : hoverTime;
  const previewPct = dragging
    ? duration > 0
      ? (dragValue / duration) * 100
      : 0
    : hoverPct;
  const showPreview = duration > 0 && (dragging || (hovering && hoverTime != null));

  return (
    <div
      ref={trackRef}
      className="relative w-full"
      onPointerMove={(e) => {
        updateHoverFromClientX(e.clientX);
        if (!hovering) setHovering(true);
      }}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => {
        setHovering(false);
        setHoverTime(null);
      }}
    >
      {showPreview && previewSeconds != null ? (
        <div
          className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 rounded-md border border-white/10 bg-[#282828] px-2 py-1 text-[11px] font-semibold tabular-nums text-white shadow-lg"
          style={{ left: `${previewPct}%` }}
        >
          {formatTime(Math.floor(previewSeconds))}
        </div>
      ) : null}
      <Slider.Root
        className="relative flex h-5 w-full cursor-pointer touch-none select-none items-center group"
        value={[displayValue]}
        max={duration || 1}
        step={0.1}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      >
        <Slider.Track className="relative h-[4px] grow rounded-full bg-white/25 transition-all duration-150 group-hover:h-[5px]">
          <Slider.Range
            ref={rangeRef}
            className="absolute h-full rounded-full bg-accent will-change-transform"
          />
        </Slider.Track>
        <Slider.Thumb
          ref={thumbRef}
          className="block size-3 rounded-full bg-accent opacity-100 outline-none will-change-transform transition-transform duration-150 group-hover:scale-110"
        />
      </Slider.Root>
    </div>
  );
});



export const VolumeSlider = React.memo(({ className = '' }: { className?: string }) => {
  const { volume, setVolume } = usePlayerStore(
    useShallow((s) => ({ volume: s.volume, setVolume: s.setVolume })),
  );
  return (
    <div className={`relative ${className}`}>
      <Slider.Root
        className="relative flex items-center h-5 w-full cursor-pointer group select-none touch-none"
        value={[volume]}
        max={100}
        step={1}
        onValueChange={([v]) => setVolume(v)}
        onKeyDown={(e) => {

          if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown'
          ) {
            e.preventDefault();
          }
        }}
        onWheel={(e) => {
          e.preventDefault();
          setVolume(Math.max(0, Math.min(100, volume + (e.deltaY < 0 ? 1 : -1))));
        }}
      >
        <Slider.Track className="relative h-[3px] grow rounded-full bg-white/[0.08] group-hover:h-[4px] transition-all duration-150">
          <Slider.Range className="absolute h-full rounded-full bg-white/60" />
        </Slider.Track>
        <Slider.Thumb className="block size-2.5 rounded-full bg-white opacity-0 outline-none transition-all duration-150 scale-0 group-hover:scale-100 group-hover:opacity-100" />
      </Slider.Root>
    </div>
  );
});



export const ControlVolumeBtn = React.memo(({ size = 'default' }: { size?: 'default' | 'sm' }) => {
  const { volume, volumeBeforeMute, setVolume } = usePlayerStore(
    useShallow((s) => ({
      volume: s.volume,
      volumeBeforeMute: s.volumeBeforeMute,
      setVolume: s.setVolume,
    })),
  );
  const s = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <button
      type="button"
      onClick={() => setVolume(volume > 0 ? 0 : volumeBeforeMute)}
      className={`${s} rounded-full flex items-center justify-center transition-all duration-150 ease-[var(--ease-apple)] cursor-pointer hover:bg-[#141414] ${
        volume === 0 ? 'text-accent' : 'text-[#ffffff99] hover:text-[#ffffff99]'
      }`}
    >
      {volume === 0 ? volumeXIcon14 : volume < 50 ? volume1Icon14 : volume2Icon14}
    </button>
  );
});



export const VolumeLabel = React.memo(() => {
  const volume = usePlayerStore((s) => s.volume);
  return (
    <span className="w-[34px] shrink-0 text-right text-[10px] font-medium tabular-nums text-[#ffffff99]">
      {volume}%
    </span>
  );
});



export const ProgressTime = React.memo(() => {
  const currentSecond = useSyncExternalStore(subscribe, () => Math.floor(getCurrentTime()));
  const duration = useSyncExternalStore(subscribe, getDuration);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-[#ffffff99] tabular-nums font-medium">
        {formatTime(currentSecond)}
      </span>
      <span className="text-[11px] text-white/20">/</span>
      <span className="text-[11px] text-[#ffffff99] tabular-nums font-medium">
        {formatTime(duration)}
      </span>
    </div>
  );
});

const ProgressBarCompact = React.memo(() => {
  const currentSecond = useSyncExternalStore(subscribe, () => Math.floor(getCurrentTime()));
  const duration = useSyncExternalStore(subscribe, getDuration);

  return (
    <div className="flex w-full max-w-[38rem] items-center gap-2">
      <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-[#ffffff99]">
        {formatTime(currentSecond)}
      </span>
      <div className="min-w-[8rem] flex-1">
        <ProgressSlider />
      </div>
      <span className="w-9 shrink-0 text-[11px] font-medium tabular-nums text-[#ffffff99]">
        {formatTime(duration)}
      </span>
    </div>
  );
});



function useTrackReactions(trackUrn: string) {
  const { data: trackData } = useQuery({
    queryKey: ['track', trackUrn],
    queryFn: () => api<Track>(`/tracks/${encodeURIComponent(trackUrn)}`),
    enabled: !!trackUrn,
    staleTime: 30_000,
  });
  return trackData;
}

function LikeButton({ trackUrn }: { trackUrn: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const trackData = useTrackReactions(trackUrn);

  const [liked, setLiked] = useState<boolean | null>(null);
  const prevUrn = useRef(trackUrn);

  useEffect(() => {
    if (prevUrn.current === trackUrn) return;
    prevUrn.current = trackUrn;
    setLiked(null);
  }, [trackUrn]);

  const globalLiked = useLiked(trackUrn);
  const isLiked = liked ?? globalLiked;

  const toggle = async () => {
    const next = !isLiked;
    setLiked(next);
    if (next && isVibeRoute()) triggerVibeLikeFlash();
    if (trackData) optimisticToggleLike(qc, trackData, next);
    invalidateAllLikesCache();

    try {
      await api(`/likes/tracks/${encodeURIComponent(trackUrn)}`, {
        method: next ? 'POST' : 'DELETE',
      });
      qc.invalidateQueries({ queryKey: ['track', trackUrn, 'favoriters'] });
    } catch {
      setLiked(!next);
      if (trackData) optimisticToggleLike(qc, trackData, !next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={t('track.likes')}
      className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
        isLiked
          ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:brightness-110'
          : 'text-[#ffffff99] hover:bg-white/10 hover:text-white'
      }`}
    >
      {isLiked ? (
        <Check size={12} strokeWidth={3} />
      ) : (
        <Heart size={13} strokeWidth={1.75} />
      )}
    </button>
  );
}



const btnClass = (active: boolean) =>
  `flex size-8 items-center justify-center rounded-full transition-colors duration-150 cursor-pointer hover:bg-[#141414] ${
    active ? 'text-accent' : 'text-[#ffffff99] hover:text-[#ffffff99]'
  }`;

const PlayPauseBtn = React.memo(() => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  return (
    <button
      type="button"
      onClick={togglePlay}
      className="mx-1 flex size-10 items-center justify-center rounded-full bg-white/90 text-black transition-[background-color,transform] duration-200 ease-[var(--ease-apple)] hover:scale-105 hover:bg-white active:scale-95 cursor-pointer"
    >
      {isPlaying ? pauseBlack16 : playBlack16}
    </button>
  );
});

const ShuffleBtn = React.memo(() => {
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  return (
    <button type="button" onClick={toggleShuffle} className={btnClass(shuffle)}>
      {shuffleIcon14}
    </button>
  );
});

const RepeatBtn = React.memo(() => {
  const repeat = usePlayerStore((s) => s.repeat);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  return (
    <button type="button" onClick={toggleRepeat} className={btnClass(repeat !== 'off')}>
      {repeat === 'one' ? repeat1Icon14 : repeatIcon14}
    </button>
  );
});

const PrevBtn = React.memo(() => (
  <button type="button" onClick={handlePrev} className={btnClass(false)}>
    {skipBack16}
  </button>
));

const NextBtn = React.memo(() => {
  const next = usePlayerStore((s) => s.next);
  return (
    <button type="button" onClick={next} className={btnClass(false)}>
      {skipForward16}
    </button>
  );
});

const QueueBtn = React.memo(({ onClick, active }: { onClick: () => void; active: boolean }) => (
  <button type="button" onClick={onClick} className={btnClass(active)}>
    {listMusic14}
  </button>
));

const LyricsBtn = React.memo(() => {
  const open = useLyricsStore((s) => s.open);
  const closePanel = useLyricsStore((s) => s.close);
  const openPanel = useLyricsStore((s) => s.openPanel);
  return (
    <button
      type="button"
      onClick={() => {
        if (open) closePanel();
        else openPanel({ tab: 'lyrics', rightPanelOpen: true });
      }}
      className={btnClass(open)}
    >
      <MicVocal size={14} strokeWidth={1.75} />
    </button>
  );
});



const TrackInfo = React.memo(() => {
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const artworkSmall = art(currentTrack?.artwork_url, 't200x200');

  if (!currentTrack) {
    return (
      <div className="flex min-w-0 flex-1 items-center">
        <p className="text-[13px] text-white/30">—</p>
      </div>
    );
  }

  return <TrackInfoBody track={currentTrack} artworkSmall={artworkSmall} navigate={navigate} />;
});

const TrackInfoBody = React.memo(function TrackInfoBody({
  track,
  artworkSmall,
  navigate,
}: {
  track: Track;
  artworkSmall: string | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const openLyricsPanel = useLyricsStore((s) => s.openPanel);
  const artistDisplay = useArtistDisplay(track);
  const displayTitle = useDisplayTitle(track);
  const artistTarget =
    track.enrichment?.primary_artist?.id && artistDisplay.verified
      ? `/artist/${encodeURIComponent(track.enrichment.primary_artist.id)}`
      : track.user?.urn
        ? `/user/${encodeURIComponent(track.user.urn)}`
        : null;
  return (
    <div className="flex w-[min(100%,15rem)] shrink-0 items-center gap-3 sm:w-[min(100%,17rem)]">
      <div
        className="relative size-12 shrink-0 overflow-hidden rounded-md cursor-pointer border border-white/10 transition-colors group/art hover:border-white/20"
        onClick={() => openLyricsPanel({ rightPanelOpen: false })}
      >
        {artworkSmall ? (
          <img src={artworkSmall} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          <div className="size-full bg-[#141414]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="min-w-0 flex-1 overflow-hidden pr-1">
          <p
            className="truncate text-[14px] font-medium leading-tight text-white cursor-pointer hover:underline"
            onClick={() => navigate(`/track/${encodeURIComponent(track.urn)}`)}
          >
            {displayTitle}
          </p>
          <p
            className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[#ffffff99] cursor-pointer transition-colors hover:text-white"
            onClick={artistTarget ? () => navigate(artistTarget) : undefined}
          >
            <UploadKindDot kind={artistDisplay.uploadKind} />
            <span className="truncate">{artistDisplay.primary}</span>
          </p>
        </div>
        <LikeButton trackUrn={track.urn} />
      </div>
    </div>
  );
});



const BackgroundGlow = React.memo(() => null);



export const NowPlayingBar = React.memo(
  ({ onQueueToggle, queueOpen }: { onQueueToggle: () => void; queueOpen: boolean }) => {
    return (
      <div className="relative z-[50] shrink-0 overflow-visible border-t border-white/[0.08] bg-black">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-full h-2.5 bg-black"
          aria-hidden
        />
        <BackgroundGlow />
        <div
          className="relative grid h-[72px] w-full grid-cols-[minmax(0,1fr)_minmax(0,38rem)_minmax(0,1fr)] items-center gap-3 px-4"
          style={{ isolation: 'isolate' }}
        >
          <DownloadProgressPanel />

          <div className="flex min-w-0 max-w-full items-center justify-self-start overflow-visible">
            <TrackInfo />
          </div>

          <div className="z-20 flex h-full w-full max-w-[38rem] min-w-[16rem] flex-col items-center justify-center gap-1.5 justify-self-center overflow-visible px-1">
            <div className="flex shrink-0 items-center gap-0.5">
              <ShuffleBtn />
              <PrevBtn />
              <PlayPauseBtn />
              <NextBtn />
              <RepeatBtn />
            </div>
            <div className="w-full shrink-0 overflow-visible">
              <ProgressBarCompact />
            </div>
          </div>

          <div className="flex items-center justify-end gap-0.5 justify-self-end pl-1">
            <LyricsBtn />
            <QueueBtn onClick={onQueueToggle} active={queueOpen} />
            <ControlVolumeBtn size="sm" />
              <VolumeSlider className="w-[88px]" />
          </div>
        </div>
      </div>
    );
  },
);
