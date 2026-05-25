import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/shallow';
import { api } from '../../lib/api';
import { getCurrentTime, getLyricsTime, handlePrev, seek, subscribe } from '../../lib/audio';
import { ago, art, durLong } from '../../lib/formatters';
import { type Comment, invalidateAllLikesCache, useTrackComments } from '../../lib/hooks';
import {
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  MicVocal,
  pauseBlack18,
  playBlack18,
  repeat1Icon16,
  repeatIcon16,
  Search,
  SkipBack,
  SkipForward,
  shuffleIcon16,
  X,
} from '../../lib/icons';
import { optimisticToggleLike, useLiked } from '../../lib/likes';
import {
  getLyricsByTrack,
  type LyricLine,
  type LyricsSource,
  searchLyricsManual,
  splitArtistTitle,
} from '../../lib/lyrics';
import { useArtistDisplay, useDisplayTitle } from '../../lib/track-display';
import {
  clampLyricsSplit,
  LYRICS_SPLIT_DEFAULT,
  LYRICS_SPLIT_KEYBOARD_STEP,
  LYRICS_SPLIT_MAX,
  LYRICS_SPLIT_MIN,
  useLyricsStore,
} from '../../stores/lyrics';
import { type Track, usePlayerStore } from '../../stores/player';
import { useSettingsStore } from '../../stores/settings';
import { ControlVolumeBtn, ProgressSlider, ProgressTime, VolumeSlider } from '../layout/NowPlayingBar';



const SOURCE_LABELS: Record<LyricsSource, string> = {
  lrclib: 'LRCLib',
  musixmatch: 'Musixmatch',
  genius: 'Genius',
  netease: 'NetEase',
  self_gen: 'AI',
  none: '',
};

const PAUSE_MARKER = '♪♪♪';
const PAUSE_GAP_THRESHOLD = 4.5; // seconds — when to insert ♪♪♪

type DisplayLine = LyricLine & { pause?: boolean; duration?: number };

function buildDisplayLines(lines: LyricLine[]): DisplayLine[] {
  if (!lines.length) return [];
  const out: DisplayLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const prev = lines[i - 1];
    if (prev) {
      const gap = cur.time - prev.time;
      if (gap >= PAUSE_GAP_THRESHOLD) {
        out.push({
          time: prev.time + 0.5,
          text: PAUSE_MARKER,
          pause: true,
          duration: gap - 0.6,
        });
      }
    } else if (cur.time >= PAUSE_GAP_THRESHOLD) {
      out.push({
        time: 0.05,
        text: PAUSE_MARKER,
        pause: true,
        duration: Math.max(0.5, cur.time - 0.1),
      });
    }
    out.push(cur);
  }
  return out;
}

function extractColor(src: string): Promise<[number, number, number]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 10;
        c.height = 10;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 10, 10);
        const d = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0,
          g = 0,
          b = 0;
        const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        resolve([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      } catch {
        resolve([255, 85, 0]);
      }
    };
    img.onerror = () => resolve([255, 85, 0]);
    img.src = src;
  });
}

function useArtworkColor(artworkUrl: string | null) {
  const colorRef = useRef<[number, number, number]>([255, 85, 0]);
  const prevArtRef = useRef<string | null>(null);

  useEffect(() => {
    const src = art(artworkUrl, 't200x200');
    if (!src || src === prevArtRef.current) return;
    prevArtRef.current = src;
    extractColor(src).then((c) => {
      colorRef.current = c;
    });
  }, [artworkUrl]);

  return colorRef;
}



const FullscreenBackground = React.memo(
  ({ artworkSrc, color }: { artworkSrc: string | null; color: [number, number, number] }) => {
    const [r, g, b] = color;
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ contain: 'strict', transform: 'translateZ(0)' }}
      >
        {artworkSrc ? (
          <>
            <img
              src={artworkSrc}
              alt=""
              className="w-full h-full object-cover scale-[1.2]  opacity-30 saturate-[1.2]"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,8,10,0.06)_0%,rgba(8,8,10,0.5)_62%,rgba(8,8,10,0.82)_100%)]" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 25% 50%, rgba(${r},${g},${b},0.2) 0%, transparent 60%),
                radial-gradient(ellipse at 75% 70%, rgba(${r},${g},${b},0.12) 0%, transparent 50%)
              `,
            }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,0.3)_0%,rgba(8,8,10,0.56)_48%,rgba(8,8,10,0.84)_100%)]" />
      </div>
    );
  },
);



const FullscreenLikeButton = React.memo(({ track }: { track: Track }) => {
  const liked = useLiked(track.urn);
  const qc = useQueryClient();

  const toggle = async () => {
    const next = !liked;
    optimisticToggleLike(qc, track, next);
    invalidateAllLikesCache();
    try {
      await api(`/likes/tracks/${encodeURIComponent(track.urn)}`, {
        method: next ? 'POST' : 'DELETE',
      });
    } catch {
      optimisticToggleLike(qc, track, !next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-white/5 outline-none ${
        liked ? 'text-accent' : 'text-[#ffffff99] hover:text-[#ffffff99]'
      }`}
    >
      <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
    </button>
  );
});



const Controls = React.memo(({ track }: { track: Track }) => {
  const { isPlaying, next, repeat, shuffle, togglePlay, toggleRepeat, toggleShuffle } =
    usePlayerStore(
      useShallow((s) => ({
        isPlaying: s.isPlaying,
        next: s.next,
        repeat: s.repeat,
        shuffle: s.shuffle,
        togglePlay: s.togglePlay,
        toggleRepeat: s.toggleRepeat,
        toggleShuffle: s.toggleShuffle,
      })),
    );

  const ctrl =
    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-white/5 outline-none';
  const small =
    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-white/5 outline-none';

  return (
    <div className="flex items-center justify-center gap-2">
      <FullscreenLikeButton track={track} />
      <button
        type="button"
        onClick={toggleShuffle}
        className={`${small} ${shuffle ? 'text-accent' : 'text-[#ffffff99] hover:text-[#ffffff99]'}`}
      >
        {shuffleIcon16}
      </button>
      <button
        type="button"
        onClick={handlePrev}
        className={`${ctrl} text-[#ffffff99] hover:text-white`}
      >
        <SkipBack size={20} fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={togglePlay}
        className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg outline-none"
      >
        {isPlaying ? pauseBlack18 : playBlack18}
      </button>
      <button type="button" onClick={next} className={`${ctrl} text-[#ffffff99] hover:text-white`}>
        <SkipForward size={20} fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={toggleRepeat}
        className={`${small} ${repeat !== 'off' ? 'text-accent' : 'text-[#ffffff99] hover:text-[#ffffff99]'}`}
      >
        {repeat === 'one' ? repeat1Icon16 : repeatIcon16}
      </button>
      <div className="ml-2 flex items-center gap-0.5 border-l border-white/10 pl-2">
        <ControlVolumeBtn size="sm" />
        <VolumeSlider className="w-[88px]" />
      </div>
    </div>
  );
});



const ArtworkViewModal = React.memo(
  ({
    src,
    title,
    subtitle,
    onClose,
  }: {
    src: string;
    title: string;
    subtitle: string;
    onClose: () => void;
  }) => {
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      };
      window.addEventListener('keydown', onKey, true);
      return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
      <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-8 sm:p-12">
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 topx-5 py-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-all hover:bg-white/20 cursor-pointer"
        >
          <X size={20} />
        </button>
        <div
          className="relative z-10 aspect-square w-[min(calc(100vw-4rem),calc(100vh-4rem))] max-w-full max-h-full sm:w-[min(calc(100vw-6rem),calc(100vh-6rem))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/24 shadow-[0_32px_128px_rgba(0,0,0,0.8)]">
            <img
              src={src}
              alt={title}
              loading="eager"
              decoding="async"
              className="h-full w-full animate-zoom-in rounded-[28px] object-cover"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-[min(560px,calc(100vw-3rem))] -translate-x-1/2 px-3">
          <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center ">
            <p className="max-w-[min(480px,calc(100vw-6rem))] truncate text-lg font-bold text-white">
              {title}
            </p>
            <p className="max-w-[min(440px,calc(100vw-6rem))] truncate text-sm text-[#ffffff99]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);



const TrackColumn = React.memo(({ track, maxArt }: { track: Track; maxArt?: string }) => {
  const { t } = useTranslation();
  const artwork500 = art(track.artwork_url, 't500x500');
  const artwork200 = art(track.artwork_url, 't200x200');
  const artistDisplay = useArtistDisplay(track);
  const displayTitle = useDisplayTitle(track);
  const [loaded, setLoaded] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showFullArt, setShowFullArt] = useState(false);
  const switchTimerRef = useRef<number | null>(null);

  const prevUrlRef = useRef(track.artwork_url);
  if (prevUrlRef.current !== track.artwork_url) {
    prevUrlRef.current = track.artwork_url;
    setLoaded(false);
    setShowFullArt(false);
    if (artwork200 && artwork500 && artwork200 !== artwork500) {
      setIsSwitching(true);
    }
  }

  useEffect(() => {
    if (!isSwitching) return;
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = window.setTimeout(() => {
      setIsSwitching(false);
      switchTimerRef.current = null;
    }, 900);
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
    };
  }, [isSwitching]);

  const widthClass = `w-full ${maxArt ?? 'max-w-[360px]'}`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-[clamp(8px,1.4vh,22px)] overflow-y-auto scrollbar-hide px-12 py-6">
      <div
        className={`${widthClass} aspect-square rounded-lg overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 relative group/art`}
      >
        {artwork500 ? (
          <>
            <img
              src={artwork200 || artwork500}
              alt=""
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-[var(--ease-apple)] ${
                isSwitching ? 'blur-2xl scale-125' : 'scale-110'
              } ${loaded ? 'opacity-0' : 'opacity-100'}`}
            />
            <img
              src={artwork500}
              alt=""
              decoding="async"
              onLoad={() => {
                setLoaded(true);
                setIsSwitching(false);
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-[var(--ease-apple)] ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <button
              type="button"
              onClick={() => setShowFullArt(true)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white cursor-pointer outline-none"
            >
              <div className="flex flex-col items-center gap-2 scale-90 group-hover/art:scale-100 transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                  <Eye size={24} />
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase opacity-70">
                  {t('track.viewArtwork')}
                </span>
              </div>
            </button>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center">
            <MicVocal size={48} className="text-white/10" />
          </div>
        )}
      </div>

      {showFullArt && artwork500 && (
        <ArtworkViewModal
          src={artwork500}
          title={displayTitle}
          subtitle={artistDisplay.primary}
          onClose={() => setShowFullArt(false)}
        />
      )}

      <div className={`${widthClass} text-center space-y-1`}>
        <div className="flex items-center justify-center gap-2 min-w-0">
          <p className="text-[18px] font-bold text-white truncate">{displayTitle}</p>
          {track.access === 'preview' && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-400/90 px-1.5 py-px rounded">
              Preview
            </span>
          )}
        </div>
        <p className="text-[14px] text-[#ffffff99] truncate">{artistDisplay.primary}</p>
      </div>

      <div className={widthClass}>
        <ProgressSlider />
        <div className="flex justify-center mt-1">
          <ProgressTime />
        </div>
      </div>

      <Controls track={track} />
    </div>
  );
});



const LyricsSourceBadge = React.memo(
  ({ source, onSearch }: { source: LyricsSource; onSearch: () => void }) => {
    const { t } = useTranslation();
    const label = source === 'self_gen' ? t('track.selfGenerated') : SOURCE_LABELS[source];
    return (
      <div className="flex items-center justify-between px-12 pt-3 pb-0">
        {label ? (
          <span className="text-[10px] font-semibold text-white/20 bg-[#141414] px-2 py-0.5 rounded-full border border-white/10">
            {label}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSearch}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/10 transition-colors cursor-pointer"
          aria-label={t('track.manualSearch')}
        >
          <Search size={14} />
        </button>
      </div>
    );
  },
);



function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function isAnimatedChar(ch: string) {
  return !/^\s$/u.test(ch);
}

interface CharCell {
  ch: string;
  animated: boolean;
}

function splitChars(text: string): CharCell[] {
  
  return Array.from(text).map((ch) => ({ ch, animated: isAnimatedChar(ch) }));
}

function splitWordsForChars(cells: CharCell[]): CharCell[][] {
  
  
  const groups: CharCell[][] = [];
  let cur: CharCell[] = [];
  let curKind: boolean | null = null;
  for (const c of cells) {
    if (c.animated !== curKind) {
      if (cur.length) groups.push(cur);
      cur = [c];
      curKind = c.animated;
    } else {
      cur.push(c);
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

const SyncedLyrics = React.memo(({ lines }: { lines: LyricLine[] }) => {
  const displayLines = useMemo(() => buildDisplayLines(lines), [lines]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(-1);
  const linesRef = useRef(displayLines);
  const lineElsRef = useRef<HTMLElement[]>([]);
  const lineCharElsRef = useRef<HTMLElement[][]>([]);
  const pauseBarsRef = useRef<Array<HTMLElement | null>>([]);
  const manualScrollRef = useRef(false);
  const lastScrollTsRef = useRef(0);
  const lineProgressRef = useRef(0);
  linesRef.current = displayLines;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    lineElsRef.current = Array.from(container.querySelectorAll<HTMLElement>('.lyric-line'));
    lineCharElsRef.current = lineElsRef.current.map((el) =>
      Array.from(el.querySelectorAll<HTMLElement>('[data-char-index]')),
    );
    pauseBarsRef.current = lineElsRef.current.map((el) =>
      el.querySelector<HTMLElement>('.lyric-pause-bar'),
    );
    activeRef.current = -1;
    lineProgressRef.current = 0;
    manualScrollRef.current = false;

    const markManual = () => {
      manualScrollRef.current = true;
    };
    container.addEventListener('wheel', markManual, { passive: true });
    container.addEventListener('touchstart', markManual, { passive: true });
    container.addEventListener('pointerdown', markManual);

    void invoke('audio_set_lyrics_timeline', {
      lines: displayLines
        .filter((line) => !line.pause)
        .map((line) => ({ timeSecs: line.time })),
    });

    const SOFT_LEAD = 0.35;
    const SOFT_TAIL = 1.0;

    const writeLineProgress = (i: number, p: number) => {
      const el = lineElsRef.current[i];
      if (!el) return;
      const value = clamp01(p);
      const valueKey = value.toFixed(4);
      if (el.dataset.lyricProgress === valueKey) return;
      el.dataset.lyricProgress = valueKey;

      el.style.setProperty('--lyric-progress', `${(value * 100).toFixed(2)}%`);
      el.style.setProperty('--lyric-progress-value', valueKey);

      const chars = lineCharElsRef.current[i];
      if (chars && chars.length > 0) {
        const total = chars.length;
        const head = value * total;
        for (let c = 0; c < total; c++) {
          const local = clamp01((head - c + SOFT_LEAD) / SOFT_TAIL);
          const eased = local * local * (3 - 2 * local);
          const charKey = eased.toFixed(4);
          const charEl = chars[c];
          if (charEl.dataset.charProgress === charKey) continue;
          charEl.dataset.charProgress = charKey;
          charEl.style.setProperty('--char-progress', charKey);
        }
      }

      const line = linesRef.current[i];
      const bar = pauseBarsRef.current[i];
      if (bar && line.pause) {
        bar.style.width = `${(value * 100).toFixed(2)}%`;
      }
    };

    const setLineState = (i: number, state: string) => {
      const el = lineElsRef.current[i];
      if (!el || el.dataset.state === state) return;
      el.dataset.state = state;

      const line = linesRef.current[i];
      const bar = pauseBarsRef.current[i];

      if (state === 'past' || state === 'past-near') {
        writeLineProgress(i, 1);
        if (bar && line.pause) bar.dataset.state = 'past';
      } else if (state === 'next' || state === 'next-near') {
        writeLineProgress(i, 0);
        if (bar && line.pause) bar.dataset.state = '';
      } else if (state === 'active') {
        if (bar && line.pause) bar.dataset.state = 'active';
      }
    };

    let rafId = 0;
    let lastWrittenProgress = -1;

    const unlistenPromise = listen<number | null>('lyrics:active_line', (event) => {
      const lineEls = lineElsRef.current;
      if (!container || lineEls.length === 0) return;

      const rawIdx = typeof event.payload === 'number' ? event.payload : -1;
      let idx = -1;
      if (rawIdx >= 0) {
        let lyricIdx = 0;
        for (let i = 0; i < linesRef.current.length; i++) {
          if (linesRef.current[i].pause) continue;
          if (lyricIdx === rawIdx) {
            idx = i;
            break;
          }
          lyricIdx++;
        }
      }
      if (idx === activeRef.current) return;

      const prev = activeRef.current;
      activeRef.current = idx;

      for (let i = 0; i < lineEls.length; i++) {
        let state: string;
        if (i === idx) state = 'active';
        else if (i === idx - 1) state = 'past-near';
        else if (i === idx + 1) state = 'next-near';
        else if (idx >= 0 && i < idx) state = 'past';
        else state = 'next';
        setLineState(i, state);
      }

      if (idx >= 0 && idx < lineEls.length) {
        const cur = linesRef.current[idx];
        const next = linesRef.current[idx + 1];
        const dur = Math.max(0.4, (next?.time ?? cur.time + 2.6) - cur.time);
        lineProgressRef.current = clamp01((getLyricsTime() - cur.time) / dur);
        lastWrittenProgress = -1;
        writeLineProgress(idx, lineProgressRef.current);
      } else {
        lineProgressRef.current = 0;
      }

      if (idx >= 0 && idx < lineEls.length && !manualScrollRef.current) {
        const el = lineEls[idx];
        const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
        const now = performance.now();
        const behavior =
          now - lastScrollTsRef.current < 220 || prev === -1 || Math.abs(idx - prev) > 2
            ? 'auto'
            : 'smooth';
        container.scrollTo({ top, behavior });
        lastScrollTsRef.current = now;
      }
    });

    const stopTick = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const paintActiveLine = () => {
      const idx = activeRef.current;
      if (idx < 0 || idx >= linesRef.current.length) return;
      const cur = linesRef.current[idx];
      if (cur.pause) return;

      let nextTime = cur.time + 2.6;
      for (let j = idx + 1; j < linesRef.current.length; j++) {
        if (!linesRef.current[j].pause) {
          nextTime = linesRef.current[j].time;
          break;
        }
      }
      const dur = Math.max(0.4, nextTime - cur.time);
      const target = clamp01((getLyricsTime() - cur.time) / dur);
      if (Math.abs(target - lastWrittenProgress) < 0.002) return;
      lastWrittenProgress = target;
      lineProgressRef.current = target;
      writeLineProgress(idx, target);
    };

    const tick = () => {
      rafId = 0;
      if (document.visibilityState === 'hidden') return;
      if (!usePlayerStore.getState().isPlaying) return;

      paintActiveLine();
      rafId = requestAnimationFrame(tick);
    };

    const startTick = () => {
      stopTick();
      if (!usePlayerStore.getState().isPlaying) return;
      if (document.visibilityState === 'hidden') return;
      lastWrittenProgress = -1;
      rafId = requestAnimationFrame(tick);
    };

    const applyPaused = (paused: boolean) => {
      container.classList.toggle('lyrics-paused', paused);
      if (paused) {
        stopTick();
        paintActiveLine();
      } else {
        startTick();
      }
    };

    applyPaused(!usePlayerStore.getState().isPlaying);

    const unsubPlayer = usePlayerStore.subscribe((s, prev) => {
      if (s.isPlaying !== prev.isPlaying) applyPaused(!s.isPlaying);
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopTick();
        return;
      }
      if (usePlayerStore.getState().isPlaying) startTick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const unsubAudio = subscribe(() => {
      if (usePlayerStore.getState().isPlaying) return;
      paintActiveLine();
    });

    return () => {
      stopTick();
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('wheel', markManual);
      container.removeEventListener('touchstart', markManual);
      container.removeEventListener('pointerdown', markManual);
      void invoke('audio_clear_lyrics_timeline');
      unlistenPromise.then((unlisten) => unlisten());
      unsubPlayer();
      unsubAudio();
    };
  }, [displayLines]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-hide px-12 py-16 relative"
      style={{
        maskImage: 'linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <div className="flex flex-col gap-2">
        {displayLines.map((line, i) => {
          if (line.pause) {
            return (
              <div
                key={`p-${line.time}-${i}`}
                className="lyric-line lyric-pause"
                style={{ ['--pause-duration' as string]: `${line.duration ?? 2}s` }}
              >
                <span className="note-gradient-text">{PAUSE_MARKER}</span>
                <div className="lyric-pause-track">
                  <div className="lyric-pause-bar" />
                </div>
              </div>
            );
          }
          const cells = splitChars(line.text);
          const groups = splitWordsForChars(cells);
          
          
          let animatedIndex = 0;
          return (
            <div
              key={`${line.time}-${i}`}
              className="lyric-line"
              onClick={() => {
                manualScrollRef.current = false;
                seek(line.time);
              }}
            >
              <span className="lyric-fill">
                {groups.map((group, gi) => {
                  if (group.length === 0) return null;
                  const isWhitespace = !group[0].animated;
                  if (isWhitespace) {
                    return <span key={gi}>{group.map((c) => c.ch).join('')}</span>;
                  }
                  return (
                    <span key={gi} className="lyric-word">
                      {group.map((c, ci) => {
                        const idx = animatedIndex++;
                        return (
                          <span key={ci} className="lyric-char" data-char-index={idx}>
                            {c.ch}
                          </span>
                        );
                      })}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-[40vh]" />
    </div>
  );
});

const PlainLyrics = React.memo(({ text }: { text: string }) => (
  <div
    className="flex-1 overflow-y-auto scrollbar-hide px-12 py-16"
    style={{ maskImage: 'linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)' }}
  >
    <div className="text-[22px] text-[#ffffff99] font-semibold whitespace-pre-wrap leading-loose tracking-tight">
      {text}
    </div>
  </div>
));

const PanelTabButton = React.memo(
  ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'text-[#ffffff99] hover:text-[#ffffff99] hover:bg-[#141414]'
      }`}
    >
      {children}
    </button>
  ),
);

const TimedCommentCard = React.memo(
  ({
    comment,
    state,
    onSeek,
  }: {
    comment: Comment;
    state: 'past' | 'active' | 'future';
    onSeek: (seconds: number) => void;
  }) => {
    const avatar = art(comment.user.avatar_url, 'small');
    const commentTime = comment.timestamp != null ? comment.timestamp / 1000 : 0;

    return (
      <button
        type="button"
        onClick={() => onSeek(commentTime)}
        className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-300 cursor-pointer ${
          state === 'active'
            ? 'bg-gradient-to-br from-white/[0.14] to-white/[0.08] border-white/14 ring-1 ring-accent/25 shadow-[0_16px_36px_rgba(0,0,0,0.26)]'
            : state === 'past'
              ? 'bg-white/[0.025] border-white/[0.035] hover:bg-[#141414]'
              : 'bg-white/[0.045] border-white/10 hover:bg-white/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <img
            src={avatar ?? ''}
            alt=""
            className="w-9 h-9 rounded-full shrink-0 ring-1 ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-white/78 truncate">
                {comment.user.username}
              </span>
              <span
                className={`text-[10px] tabular-nums shrink-0 ${
                  state === 'active' ? 'text-accent' : 'text-[#ffffff99]'
                }`}
              >
                {durLong(comment.timestamp ?? 0)}
              </span>
              <span className="text-[10px] text-white/18 ml-auto shrink-0">
                {ago(comment.created_at)}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-white/58 break-words">
              {comment.body}
            </p>
          </div>
        </div>
      </button>
    );
  },
);

const TimedCommentsRail = React.memo(({ trackUrn }: { trackUrn: string }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const [activeIndex, setActiveIndex] = useState(-1);
  const { comments, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useTrackComments(trackUrn);

  const timedComments = useMemo(
    () =>
      [...comments]
        .filter((comment) => comment.timestamp != null && comment.body.trim())
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
    [comments],
  );

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const getIndexForTime = (timeMs: number) => {
      if (timedComments.length === 0) return -1;
      let lo = 0;
      let hi = timedComments.length - 1;
      let best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const timestamp = timedComments[mid].timestamp ?? 0;
        if (timestamp <= timeMs) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return best;
    };

    const syncActiveIndex = () => {
      const nextIndex = getIndexForTime(Math.max(0, getCurrentTime()) * 1000);
      setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    };

    syncActiveIndex();

    const unsubPlayer = usePlayerStore.subscribe((s, prev) => {
      if (s.isPlaying !== prev.isPlaying) syncActiveIndex();
    });

    const unsubAudio = subscribe(() => {
      if (!usePlayerStore.getState().isPlaying) return;
      syncActiveIndex();
    });

    return () => {
      unsubPlayer();
      unsubAudio();
    };
  }, [timedComments]);

  const focusIndex = activeIndex >= 0 ? activeIndex : timedComments.length > 0 ? 0 : -1;

  useEffect(() => {
    if (focusIndex < 0) return;
    const container = containerRef.current;
    const item = itemRefs.current.get(timedComments[focusIndex]?.id ?? -1);
    if (!container || !item) return;
    const top = item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [focusIndex, timedComments]);

  if (isLoading && timedComments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-white/15" />
        <p className="text-[13px] text-[#ffffff99]">{t('track.comments')}</p>
      </div>
    );
  }

  if (timedComments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-12 text-center">
        <MessageCircle size={40} className="text-white/[0.06]" />
        <p className="text-[15px] text-[#ffffff99] font-medium">{t('track.noComments')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 px-8 pb-8">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide px-4 py-[32vh] space-y-3 relative"
        style={{
          maskImage: 'linear-gradient(transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        {timedComments.map((comment, index) => {
          const state = index < activeIndex ? 'past' : index === activeIndex ? 'active' : 'future';
          const distance = Math.abs(index - focusIndex);
          const scale = Math.max(0.9, 1 - distance * 0.035);
          const opacity =
            state === 'active' ? 1 : Math.max(0.28, distance === 0 ? 0.94 : 1 - distance * 0.15);

          return (
            <div
              key={comment.id}
              ref={(node) => {
                if (node) itemRefs.current.set(comment.id, node);
                else itemRefs.current.delete(comment.id);
              }}
              className="relative"
              style={{
                transform: `scale(${scale}) translateZ(0)`,
                opacity,
                filter: distance >= 4 ? 'blur(1.5px)' : distance >= 2 ? 'blur(0.6px)' : 'none',
              }}
            >
              <TimedCommentCard
                comment={comment}
                state={state}
                onSeek={(seconds) => seek(seconds)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

const ManualSearchPanel = React.memo(
  ({
    initialArtist,
    initialTitle,
    onCancel,
    onSubmit,
  }: {
    initialArtist: string;
    initialTitle: string;
    onCancel: () => void;
    onSubmit: (artist: string, title: string) => void;
  }) => {
    const { t } = useTranslation();
    const [artist, setArtist] = useState(initialArtist);
    const [title, setTitle] = useState(initialTitle);

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-12 animate-fade-in-up">
        <h3 className="text-[#ffffff99] font-bold mb-2">{t('track.manualSearch')}</h3>
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          autoFocus
          className="w-full max-w-[280px] bg-white/10 px-4 py-2.5 rounded-xl text-white text-[14px] outline-none border border-transparent focus:border-white/20 placeholder:text-[#ffffff99]"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && artist.trim() && title.trim()) {
              onSubmit(artist.trim(), title.trim());
            }
          }}
          className="w-full max-w-[280px] bg-white/10 px-4 py-2.5 rounded-xl text-white text-[14px] outline-none border border-transparent focus:border-white/20 placeholder:text-[#ffffff99]"
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-[13px] font-medium text-[#ffffff99] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            disabled={!artist.trim() || !title.trim()}
            onClick={() => onSubmit(artist.trim(), title.trim())}
            className="px-6 py-2 rounded-full text-[13px] font-bold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('track.search')}
          </button>
        </div>
      </div>
    );
  },
);

const SplitDivider = React.memo(
  ({
    splitRatio,
    onChange,
    layoutRef,
  }: {
    splitRatio: number;
    onChange: (ratio: number) => void;
    layoutRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    const { t } = useTranslation();
    const [active, setActive] = useState(false);
    const draggingRef = useRef(false);
    const splitPercent = splitRatio * 100;

    useEffect(() => {
      if (!active) return;
      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
      };
    }, [active]);

    const updateFromX = (clientX: number) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const rect = layout.getBoundingClientRect();
      if (rect.width <= 0) return;
      onChange(clampLyricsSplit((clientX - rect.left) / rect.width));
    };

    const stop = () => {
      draggingRef.current = false;
      setActive(false);
    };

    return (
      <div
        role="separator"
        aria-label={t('track.resizeLayout')}
        aria-orientation="vertical"
        aria-valuemin={Math.round(LYRICS_SPLIT_MIN * 100)}
        aria-valuemax={Math.round(LYRICS_SPLIT_MAX * 100)}
        aria-valuenow={Math.round(splitPercent)}
        tabIndex={0}
        className="group/splitter absolute top-0 bottom-0 z-20 w-6 -translate-x-1/2 touch-none cursor-col-resize outline-none"
        style={{ left: `${splitPercent}%` }}
        onPointerDown={(event) => {
          event.preventDefault();
          draggingRef.current = true;
          setActive(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromX(event.clientX);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          draggingRef.current = false;
          setActive(false);
          onChange(LYRICS_SPLIT_DEFAULT);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          updateFromX(event.clientX);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onChange(clampLyricsSplit(splitRatio - LYRICS_SPLIT_KEYBOARD_STEP));
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            onChange(clampLyricsSplit(splitRatio + LYRICS_SPLIT_KEYBOARD_STEP));
          }
        }}
      >
        <div
          className={`absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 transition-colors duration-150 ${
            active ? 'bg-white/20' : 'bg-[#141414] group-hover/splitter:bg-white/10'
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 flex h-14 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-150 ${
            active
              ? 'border-white/18 bg-white/[0.12] shadow-[0_0_20px_rgba(255,255,255,0.08)]'
              : 'border-white/10 bg-[#141414] group-hover/splitter:border-white/14 group-hover/splitter:bg-white/[0.08]'
          }`}
        >
          <div className="flex flex-col gap-1.5">
            <span className="block h-1 w-[2px] rounded-full bg-white/35" />
            <span className="block h-1 w-[2px] rounded-full bg-white/35" />
            <span className="block h-1 w-[2px] rounded-full bg-white/35" />
          </div>
        </div>
      </div>
    );
  },
);

const LyricsPane = React.memo(({ track }: { track: Track }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [manualQuery, setManualQuery] = useState<{ artist: string; title: string } | null>(null);

  useEffect(() => {
    setManualQuery(null);
    setIsEditing(false);
  }, [track.urn]);

  const { data: lyrics, isLoading } = useQuery({
    queryKey: manualQuery
      ? ['lyrics', 'search', manualQuery.artist, manualQuery.title, track.duration]
      : ['lyrics', 'track', track.urn],
    queryFn: () =>
      manualQuery
        ? searchLyricsManual(manualQuery.artist, manualQuery.title, track.duration)
        : getLyricsByTrack(track.urn),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  const startSearch = () => {
    const parsed = splitArtistTitle(track.title);
    setIsEditing(true);
    if (!manualQuery) {
      setManualQuery(
        (prev) =>
          prev ?? { artist: parsed?.[0] || track.user.username, title: parsed?.[1] || track.title },
      );
    }
  };

  if (isEditing) {
    const parsed = splitArtistTitle(track.title);
    const initialArtist = manualQuery?.artist || parsed?.[0] || track.user.username;
    const initialTitle = manualQuery?.title || parsed?.[1] || track.title;
    return (
      <ManualSearchPanel
        initialArtist={initialArtist}
        initialTitle={initialTitle}
        onCancel={() => setIsEditing(false)}
        onSubmit={(artist, title) => {
          setManualQuery({ artist, title });
          setIsEditing(false);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-white/15" />
        <p className="text-[13px] text-[#ffffff99]">{t('track.lyricsLoading')}</p>
      </div>
    );
  }

  if (lyrics?.synced && lyrics.synced.length > 0) {
    return (
      <>
        <LyricsSourceBadge source={lyrics.source} onSearch={startSearch} />
        <SyncedLyrics lines={lyrics.synced} />
      </>
    );
  }

  if (lyrics?.plain) {
    return (
      <>
        <LyricsSourceBadge source={lyrics.source} onSearch={startSearch} />
        <PlainLyrics text={lyrics.plain} />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-12 text-center relative">
      <button
        type="button"
        onClick={startSearch}
        aria-label={t('track.manualSearch')}
        className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Search size={14} />
      </button>
      <MicVocal size={40} className="text-white/[0.06]" />
      <p className="text-[15px] text-[#ffffff99] font-medium">{t('track.lyricsNotFound')}</p>
      <p className="text-[12px] text-white/15 leading-relaxed max-w-[300px]">
        {t('track.lyricsNotFoundHint')}
      </p>
    </div>
  );
});


const VIS_BINS = 64;

function readAccentRgb(): [number, number, number] {
  if (typeof window === 'undefined') return [255, 85, 0];
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
  if (raw.startsWith('#')) {
    const hex = raw.slice(1);
    const v =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    return [
      Number.parseInt(v.slice(0, 2), 16),
      Number.parseInt(v.slice(2, 4), 16),
      Number.parseInt(v.slice(4, 6), 16),
    ];
  }
  const m = raw.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return [255, 85, 0];
}

const FullscreenVisualizer = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);


  const targetRef = useRef<Float32Array>(new Float32Array(VIS_BINS));
  const displayRef = useRef<Float32Array>(new Float32Array(VIS_BINS));

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const accent = readAccentRgb();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      cssW = Math.max(1, Math.floor(r.width));
      cssH = Math.max(1, Math.floor(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    
    const smoothedBins = new Float32Array(VIS_BINS);
    
    let sampleXs: Float32Array | null = null;
    const buildSampleXs = () => {
      const xs = new Float32Array(VIS_BINS);
      for (let i = 0; i < VIS_BINS; i++) xs[i] = (i / (VIS_BINS - 1)) * cssW;
      sampleXs = xs;
    };

    const draw = () => {
      if (document.visibilityState === 'hidden') return;
      ctx.clearRect(0, 0, cssW, cssH);
      if (!sampleXs || sampleXs.length !== VIS_BINS) buildSampleXs();

      const display = displayRef.current;

      
      
      smoothedBins[0] = (display[0] * 3 + display[1]) * 0.25;
      smoothedBins[VIS_BINS - 1] = (display[VIS_BINS - 1] * 3 + display[VIS_BINS - 2]) * 0.25;
      for (let i = 1; i < VIS_BINS - 1; i++) {
        smoothedBins[i] = display[i - 1] * 0.25 + display[i] * 0.5 + display[i + 1] * 0.25;
      }

      
      const baseY = cssH - 6;
      const maxAmp = cssH * 0.78;
      const xs = sampleXs!;

      let peak = 0;
      for (let i = 0; i < VIS_BINS; i++) if (display[i] > peak) peak = display[i];

      
      
      
      const tracePath = (ampScale: number) => {
        ctx.beginPath();
        const y0 = baseY - smoothedBins[0] * maxAmp * ampScale;
        ctx.moveTo(xs[0], y0);
        for (let i = 0; i < VIS_BINS - 1; i++) {
          const yA = baseY - smoothedBins[i] * maxAmp * ampScale;
          const yB = baseY - smoothedBins[i + 1] * maxAmp * ampScale;
          const xA = xs[i];
          const xB = xs[i + 1];
          const xMid = (xA + xB) * 0.5;
          const yMid = (yA + yB) * 0.5;
          ctx.quadraticCurveTo(xA, yA, xMid, yMid);
        }
        
        ctx.lineTo(xs[VIS_BINS - 1], baseY - smoothedBins[VIS_BINS - 1] * maxAmp * ampScale);
      };

      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, cssH);
      fillGrad.addColorStop(0, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0)`);
      fillGrad.addColorStop(
        0.5,
        `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${(0.18 * Math.min(1, peak * 1.3)).toFixed(3)})`,
      );
      fillGrad.addColorStop(
        1,
        `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${(0.32 * Math.min(1, peak * 1.3)).toFixed(3)})`,
      );

      tracePath(1.0);
      ctx.lineTo(cssW, baseY);
      ctx.lineTo(0, baseY);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      
      const drawStroke = (
        ampScale: number,
        alphaMul: number,
        hueAccent: boolean,
        lineW: number,
      ) => {
        tracePath(ampScale);
        const [rC, gC, bC] = hueAccent ? accent : [255, 255, 255];
        const peakAlpha = (0.45 + 0.4 * Math.min(1, peak)) * alphaMul;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineW;
        ctx.strokeStyle = `rgba(${rC}, ${gC}, ${bC}, ${peakAlpha.toFixed(3)})`;
        ctx.shadowBlur = 24 * alphaMul;
        ctx.shadowColor = `rgba(${rC}, ${gC}, ${bC}, ${(peakAlpha * 0.6).toFixed(3)})`;
        ctx.stroke();
      };

      drawStroke(1.0, 1.0, true, 2.4);
      drawStroke(0.78, 0.5, false, 1.2);
      ctx.shadowBlur = 0;
    };

    let rafId = 0;
    let lastEventTs = 0;
    let lastDecayTs = performance.now();

    
    
    let dirty = false;
    const ensureLoop = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(loop);
    };
    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastDecayTs) / 1000);
      lastDecayTs = ts;

      
      const target = targetRef.current;
      const display = displayRef.current;
      const attack = 1 - Math.exp(-dt * 18); 
      const release = 1 - Math.exp(-dt * 5); 
      let any = false;
      for (let i = 0; i < VIS_BINS; i++) {
        const t = target[i];
        const d = display[i];
        const k = t > d ? attack : release;
        const next = d + (t - d) * k;
        display[i] = next;
        if (next > 1e-3 || t > 1e-3) any = true;
      }

      draw();

      const sinceEvent = ts - lastEventTs;
      
      
      
      if (any && (dirty || sinceEvent < 350)) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
        dirty = false;
      }
    };

    const unlistenPromise = listen<number[]>('audio:fft', (event) => {
      const bins = event.payload;
      if (!bins || bins.length === 0) return;
      const target = targetRef.current;
      const n = Math.min(target.length, bins.length);
      for (let i = 0; i < n; i++) target[i] = bins[i];
      lastEventTs = performance.now();
      dirty = true;
      ensureLoop();
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      unlistenPromise.then((u) => u());
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-x-0 bottom-0 z-0 pointer-events-none"
      style={{
        height: 'min(56vh, 460px)',
        
        
        maskImage: 'linear-gradient(to top, black 0%, black 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 0%, black 60%, transparent 100%)',
        contain: 'strict',
        transform: 'translateZ(0)',
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
});



export const LyricsPanel = React.memo(() => {
  const open = useLyricsStore((s) => s.open);
  const close = useLyricsStore((s) => s.close);
  const tab = useLyricsStore((s) => s.tab);
  const setTab = useLyricsStore((s) => s.setTab);
  const rightPanelOpen = useLyricsStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useLyricsStore((s) => s.setRightPanelOpen);
  const toggleRightPanel = useLyricsStore((s) => s.toggleRightPanel);
  const splitRatio = useLyricsStore((s) => s.splitRatio);
  const setSplitRatio = useLyricsStore((s) => s.setSplitRatio);
  const track = usePlayerStore((s) => s.currentTrack);
  const { t } = useTranslation();
  const colorRef = useArtworkColor(track?.artwork_url ?? null);
  const splitLayoutRef = useRef<HTMLDivElement>(null);
  const visualizerEnabled = useSettingsStore((s) => s.lyricsVisualizer);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!open || !track) return null;

  const artwork500 = art(track.artwork_url, 't500x500');
  const splitPercent = splitRatio * 100;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden animate-fade-in-up bg-[#0a0a0a]">
      <FullscreenBackground artworkSrc={artwork500} color={colorRef.current} />
      {visualizerEnabled && <FullscreenVisualizer />}

      <div
        className={`relative z-10 px-6 pt-5 pb-2 ${rightPanelOpen ? 'flex items-center justify-between gap-2' : 'flex items-center justify-center gap-2'}`}
        data-tauri-drag-region
      >
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] p-1">
          <PanelTabButton
            active={rightPanelOpen && tab === 'lyrics'}
            onClick={() => {
              setTab('lyrics');
              setRightPanelOpen(true);
            }}
          >
            {t('track.lyrics')}
          </PanelTabButton>
          <PanelTabButton
            active={rightPanelOpen && tab === 'comments'}
            onClick={() => {
              setTab('comments');
              setRightPanelOpen(true);
            }}
          >
            {t('track.comments')}
          </PanelTabButton>
          <PanelTabButton active={!rightPanelOpen} onClick={toggleRightPanel}>
            {rightPanelOpen ? t('track.hidePanel') : t('track.showPanel')}
          </PanelTabButton>
        </div>
        <button
          type="button"
          onClick={close}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {rightPanelOpen ? (
        <div
          ref={splitLayoutRef}
          className="relative z-10 grid flex-1 min-h-0"
          style={{
            isolation: 'isolate',
            gridTemplateColumns: `${splitPercent}% ${100 - splitPercent}%`,
          }}
        >
          <div className="min-w-0 min-h-0">
            <TrackColumn track={track} />
          </div>

          <SplitDivider
            splitRatio={splitRatio}
            onChange={setSplitRatio}
            layoutRef={splitLayoutRef}
          />

          <div className="min-w-0 min-h-0 flex flex-col relative">
            {tab === 'comments' ? (
              <TimedCommentsRail trackUrn={track.urn} />
            ) : (
              <LyricsPane track={track} />
            )}
          </div>
        </div>
      ) : (
        <div
          className="relative z-10 flex-1 flex items-center justify-center min-h-0"
          style={{ isolation: 'isolate' }}
        >
          <TrackColumn track={track} maxArt="max-w-[420px]" />
        </div>
      )}
    </div>
  );
});
