import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import i18n from '../i18n';
import type { PlaybackQuality, Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';
import { useSettingsStore } from '../stores/settings';
import {
  api,
  buildStorageUrls,
  downloadFallbackUrls,
  getSessionId,
  resolveTrackFromStreaming,
  streamFallbackUrls,
} from './api';
import {
  enforceAudioCacheLimit,
  ensureTrackCached,
  getCacheInfo,
  type TrackCacheInfo,
} from './cache';
import { trackedInvoke as invoke } from './diagnostics';
import { recordEvent } from './events';
import { art } from './formatters';
import { rememberTracks } from './offline-index';
import {
  clearPlaybackResume,
  getResumePosition,
  savePlaybackResume,
} from './playback-resume';
import { getUrnCluster, recordClusterFeedback } from './recsFeedback';
import { playNextVibeTrack } from './vibe-playlist';
import { getArtistDisplay, getDisplayTitle } from './track-display';

function applyEqFromSettings() {
  const { eqEnabled, eqGains } = useSettingsStore.getState();
  return invoke('audio_set_eq', { enabled: eqEnabled, gains: eqGains }).catch(console.error);
}


const FULL_PLAY_RATIO = 0.5;



let currentUrn: string | null = null;
let loadingUrn: string | null = null;
let loadingSelectionKey: string | null = null;
let engineSelectionKey: string | null = null;
let hasTrack = false;
let fallbackDuration = 0;
let cachedTime = 0;
let cachedDuration = 0;
let loadGen = 0;
let lastEndedUrn: string | null = null;
let lastTickPos = 0;
let lastTickAt = 0;
const listeners = new Set<() => void>();
const API_PREVIEW_DURATION_MS = 30_000;
const LOAD_ENDED_SUPPRESS_MS = 5000;
const ENDED_TAIL_SUPPRESS_MS = 1500;

let suppressEndedUntil = 0;
let crossfadeAdvanceScheduled = false;
let allowCrossfadeOnNextLoad = false;
let crossfadeSourceUrn: string | null = null;
let crossfadePreloadUrn: string | null = null;
let lastResumePersistAt = 0;

function peekNextQueueTrack(): Track | null {
  const { queue, queueIndex, repeat } = usePlayerStore.getState();
  if (queue.length === 0) return null;
  let nextIdx = queueIndex + 1;
  if (nextIdx >= queue.length) {
    if (repeat === 'all') nextIdx = 0;
    else return null;
  }
  return queue[nextIdx] ?? null;
}

function markAutoAdvanceCrossfade() {
  const fromUrn = currentUrn;
  if (!fromUrn) return;
  if (usePlayerStore.getState().playbackContext?.kind === 'vibe') return;

  const { crossfadeEnabled, crossfadeSeconds } = useSettingsStore.getState();
  if (crossfadeEnabled && crossfadeSeconds >= 1) {
    allowCrossfadeOnNextLoad = true;
    crossfadeSourceUrn = fromUrn;
  }
}

function shouldUseCrossfade(nextUrn: string): boolean {
  if (!allowCrossfadeOnNextLoad) return false;
  allowCrossfadeOnNextLoad = false;
  const sourceUrn = crossfadeSourceUrn;
  crossfadeSourceUrn = null;
  if (!sourceUrn || sourceUrn === nextUrn || !hasTrack) return false;
  const { crossfadeEnabled, crossfadeSeconds } = useSettingsStore.getState();
  return crossfadeEnabled && crossfadeSeconds >= 1;
}

function effectivePlaybackDuration(): number {
  if (cachedDuration > 0) return Math.max(cachedDuration, cachedTime);
  return fallbackDuration;
}

async function invokeTrackLoad(
  path: string,
  cacheKey: string,
  shouldPlay: boolean,
  useCrossfade: boolean,
): Promise<{ duration_secs: number | null }> {
  if (useCrossfade) {
    return invoke<{ duration_secs: number | null }>('audio_crossfade_file', {
      path,
      cacheKey,
      fadeSecs: useSettingsStore.getState().crossfadeSeconds,
      startPaused: !shouldPlay,
    });
  }
  return invoke<{ duration_secs: number | null }>('audio_load_file', {
    path,
    cacheKey,
    startPaused: !shouldPlay,
  });
}

function suppressPlaybackEnded(ms: number) {
  suppressEndedUntil = Math.max(suppressEndedUntil, performance.now() + ms);
}

function isPlaybackEndedSuppressed(): boolean {
  return performance.now() < suppressEndedUntil;
}

function notify() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentTime(): number {
  return cachedTime;
}

function syncTickSnapshot(pos: number) {
  lastTickPos = pos;
  lastTickAt = performance.now();
}


export function getLyricsTime(): number {
  if (!hasTrack) return 0;
  if (!usePlayerStore.getState().isPlaying) return cachedTime;
  const rate = usePlayerStore.getState().playbackRate;
  const elapsed = (performance.now() - lastTickAt) / 1000;
  const pos = lastTickPos + elapsed * rate;
  const max = getDuration();
  return max > 0 ? Math.min(pos, max) : pos;
}

export function getDuration(): number {
  return cachedDuration;
}

export function seek(seconds: number) {
  if (!hasTrack) return;
  crossfadeAdvanceScheduled = false;
  invoke('audio_seek', { position: seconds }).catch(console.error);
  cachedTime = seconds;
  syncTickSnapshot(seconds);
  notify();
  if (currentUrn && seconds > 0) {
    savePlaybackResume(currentUrn, seconds);
  }
  setTimeout(() => updateMediaPosition(), 150);
}

export function handlePrev() {
  if (getCurrentTime() > 3) {
    seek(0);
  } else {
    usePlayerStore.getState().prev();
  }
}



function getSelectionKey(track: Track | null, queueIndex: number): string | null {
  if (!track) return null;
  return `${track.urn}@${queueIndex}`;
}

function selectionKeyFromStore(): string | null {
  const { currentTrack, queueIndex } = usePlayerStore.getState();
  return getSelectionKey(currentTrack, queueIndex);
}

function isStaleLoad(gen: number): boolean {
  return gen !== loadGen;
}

function releaseLoadLocks(gen: number) {
  if (isStaleLoad(gen)) return;
  loadingUrn = null;
  loadingSelectionKey = null;
}

let loadPipeline: Promise<void> = Promise.resolve();

function stopTrack() {
  allowCrossfadeOnNextLoad = false;
  crossfadeSourceUrn = null;
  invoke('audio_stop').catch(console.error);
  hasTrack = false;
  cachedTime = 0;
  syncTickSnapshot(0);
}

export async function switchAudioDevice(deviceName: string | null, manual = false) {
  if (manual) {
    await invoke('audio_set_follow_default_output', { follow: deviceName == null });
  }

  await invoke('audio_switch_device', { deviceName });
}


export async function reloadCurrentTrack() {
  const track = usePlayerStore.getState().currentTrack;
  if (!track) return;
  const wasPlaying = usePlayerStore.getState().isPlaying;
  const pos = cachedTime;
  await loadTrack(track);
  if (pos > 0) seek(pos);
  if (!wasPlaying) invoke('audio_pause').catch(console.error);
}

function getLoadErrorText(error: unknown): string | null {
  let message: string | null = null;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error) {
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
    } else if ('error' in error && typeof error.error === 'string') {
      message = error.error;
    }
  }

  if (!message) {
    const fallback = String(error).trim();
    if (fallback && fallback !== '[object Object]') {
      message = fallback;
    }
  }

  if (!message) return null;

  const normalized = message
    .trim()
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Command [^:]+ failed:\s*/i, '');

  const unquoted =
    normalized.startsWith('"') && normalized.endsWith('"')
      ? normalized.slice(1, -1).trim()
      : normalized;

  const sanitized = unquoted
    .replace(/\bhttps?:\/\/[^\s"')\]]+/gi, '')
    .replace(/\bscproxy:\/\/[^\s"')\]]+/gi, '')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~-]+/gi, '$1 [redacted]')
    .replace(
      /\b(oauth_token|token|sig|signature|client_id|x-session-id)=([^&\s]+)/gi,
      '$1=[redacted]',
    )
    .replace(/\s+\bfrom\b\s*(?=$|[):;,.])/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([):;,.])/g, '$1')
    .trim();

  return sanitized || null;
}

type TrackMetadataPatch = Partial<Track> & {
  full_duration?: number;
};

function getResolvedDurationMs(track: {
  duration?: number;
  full_duration?: number;
}): number | null {
  if (typeof track.full_duration === 'number' && track.full_duration > 0) {
    return track.full_duration;
  }
  if (typeof track.duration === 'number' && track.duration > 0) {
    return track.duration;
  }
  return null;
}

function getPreviewResolveUrl(track: Pick<Track, 'duration' | 'permalink_url'>): string | null {
  if (track.duration !== API_PREVIEW_DURATION_MS || !track.permalink_url) {
    return null;
  }

  try {
    const url = new URL(track.permalink_url);
    return url.hostname.endsWith('soundcloud.com') ? url.toString() : null;
  } catch {
    return null;
  }
}

function mergeTrackMetadata(base: Track, patch: TrackMetadataPatch): Track {
  const resolvedDuration = getResolvedDurationMs(patch);

  return {
    ...base,
    ...patch,
    duration:
      resolvedDuration == null ||
      (resolvedDuration === API_PREVIEW_DURATION_MS && base.duration > API_PREVIEW_DURATION_MS)
        ? base.duration
        : resolvedDuration,
    permalink_url: patch.permalink_url ?? base.permalink_url,
    user: patch.user ? { ...base.user, ...patch.user } : base.user,
  };
}

function commitTrackMetadata(track: Track) {
  usePlayerStore.getState().replaceTrackMetadata(track);
  void rememberTracks([track]);

  if (currentUrn !== track.urn) return;

  if (track.duration <= 0) {
    updateMetadata(track);
    return;
  }

  const durationSecs = track.duration / 1000;
  fallbackDuration = durationSecs;
  cachedDuration = durationSecs;
  updateMetadata(track, durationSecs);
  notify();
}

const metadataInflight = new Map<string, Promise<Track>>();
const metadataFailUntil = new Map<string, number>();
const METADATA_FAIL_COOLDOWN_MS = 90_000;

async function fetchFreshTrackMetadata(track: Track): Promise<Track> {
  if (!getSessionId()) return track;

  const failUntil = metadataFailUntil.get(track.urn) ?? 0;
  if (Date.now() < failUntil) return track;

  const inflight = metadataInflight.get(track.urn);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const freshTrack = await api<Track>(
        `/tracks/${encodeURIComponent(track.urn)}`,
        {},
        undefined,
        { silent: true },
      );
      return mergeTrackMetadata(track, freshTrack);
    } catch {
      metadataFailUntil.set(track.urn, Date.now() + METADATA_FAIL_COOLDOWN_MS);
      return track;
    } finally {
      metadataInflight.delete(track.urn);
    }
  })();

  metadataInflight.set(track.urn, promise);
  return promise;
}

async function resolveTrackMetadata(track: Track): Promise<Track> {
  const resolveUrl = getPreviewResolveUrl(track);
  if (!resolveUrl) return track;

  try {
    const resolvedTrack = await resolveTrackFromStreaming(resolveUrl);
    return mergeTrackMetadata(track, resolvedTrack);
  } catch (error) {
    console.warn('[Audio] Failed to resolve preview duration:', error);
    return track;
  }
}

async function loadTrack(track: Track, playIntent?: boolean) {
  const gen = ++loadGen;
  loadPipeline = loadPipeline
    .then(() => loadTrackWork(track, playIntent, gen))
    .catch(() => loadTrackWork(track, playIntent, gen));
}

async function loadTrackWork(track: Track, playIntent: boolean | undefined, gen: number) {
  const prevUrn = currentUrn;
  const urn = track.urn;
  const queueIndex = usePlayerStore.getState().queueIndex;
  const selectionKey = getSelectionKey(track, queueIndex);
  const shouldPlay = playIntent ?? usePlayerStore.getState().isPlaying;

  const useCrossfade = shouldUseCrossfade(urn);
  const fadeSecs = useSettingsStore.getState().crossfadeSeconds;
  if (prevUrn && prevUrn !== urn && cachedTime > 0) {
    savePlaybackResume(prevUrn, cachedTime);
  }
  suppressPlaybackEnded(
    useCrossfade ? (fadeSecs + 2) * 1000 : LOAD_ENDED_SUPPRESS_MS,
  );
  loadingUrn = urn;
  loadingSelectionKey = selectionKey;
  if (!useCrossfade) {
    stopTrack();
  }
  currentUrn = urn;

  if (prevUrn && prevUrn !== urn) {
    invoke('track_cancel_upgrade', { urn: prevUrn }).catch(console.error);
  }

  void hydrateTrackMetadata(track, gen);

  fallbackDuration = track.duration / 1000;
  cachedDuration = fallbackDuration;
  cachedTime = 0;
  syncTickSnapshot(0);
  usePlayerStore.setState({ downloadProgress: null });
  usePlayerStore.getState().setPlaybackTransport(null, null);
  notify();

  
  const { normalizeVolume } = useSettingsStore.getState();
  void applyEqFromSettings();
  invoke('audio_set_normalization', { enabled: normalizeVolume }).catch(console.error);

  
  invoke('audio_set_volume', { volume: usePlayerStore.getState().volume }).catch(console.error);
  invoke('audio_set_playback_rate', { rate: getEffectivePlaybackRate() }).catch(console.error);

  try {
    const highQualityStreaming = useSettingsStore.getState().highQualityStreaming;

    
    const cached = await getCacheInfo(urn);
    if (isStaleLoad(gen)) return;
    if (cached?.path) {
      usePlayerStore.getState().setPlaybackTransport(cached.quality, cached.source);
      console.log('[Audio] Playing from cache:', urn);
      const loadResult = await invokeTrackLoad(cached.path, urn, shouldPlay, useCrossfade);
      if (isStaleLoad(gen)) return;
      if (loadResult?.duration_secs) {
        fallbackDuration = loadResult.duration_secs;
        cachedDuration = loadResult.duration_secs;
        updateMetadata(track, loadResult.duration_secs);
        notify();
      }
      usePlayerStore.setState({ downloadProgress: null });
      const durationSecs = loadResult?.duration_secs ?? fallbackDuration;
      const resumePos = useCrossfade ? 0 : getResumePosition(urn, durationSecs);
      afterLoad(track, gen, queueIndex, shouldPlay, resumePos);
      return;
    }

    
    usePlayerStore.setState({ downloadProgress: 0.001 });

    let cachedInfo: TrackCacheInfo;
    try {
      cachedInfo = await ensureTrackCached(urn, highQualityStreaming);
    } catch (error) {
      if (!highQualityStreaming) throw error;
      console.warn('[Audio] HQ load failed, retrying without hq:', error);
      cachedInfo = await ensureTrackCached(urn, false);
    }

    if (isStaleLoad(gen)) return;
    usePlayerStore.setState({ downloadProgress: null });
    usePlayerStore.getState().setPlaybackTransport(cachedInfo.quality, cachedInfo.source);

    console.log('[Audio] Playing downloaded track:', urn);
    const loadResult = await invokeTrackLoad(cachedInfo.path, urn, shouldPlay, useCrossfade);
    if (isStaleLoad(gen)) return;
    if (loadResult?.duration_secs) {
      fallbackDuration = loadResult.duration_secs;
      cachedDuration = loadResult.duration_secs;
      updateMetadata(track, loadResult.duration_secs);
      notify();
    }
    void enforceAudioCacheLimit().catch(console.error);

    const durationSecs = loadResult?.duration_secs ?? fallbackDuration;
    const resumePos = useCrossfade ? 0 : getResumePosition(urn, durationSecs);
    afterLoad(track, gen, queueIndex, shouldPlay, resumePos);
  } catch (e) {
    console.error('[Audio] Load failed:', e);
    usePlayerStore.setState({ downloadProgress: null });
    usePlayerStore.getState().setPlaybackTransport(null, null);
    if (isStaleLoad(gen)) return;
    releaseLoadLocks(gen);
    const errorText = getLoadErrorText(e);
    toast.error(i18n.t('track.loadError'), {
      description: errorText ? `${track.title}: ${errorText}` : track.title,
    });
    usePlayerStore.getState().pause();
  }
}

function afterLoad(
  track: Track,
  gen: number,
  queueIndex: number,
  shouldPlay: boolean,
  resumePosition = 0,
) {
  if (isStaleLoad(gen)) return;
  if (usePlayerStore.getState().currentTrack?.urn !== track.urn) {
    releaseLoadLocks(gen);
    return;
  }
  if (usePlayerStore.getState().queueIndex !== queueIndex) {
    releaseLoadLocks(gen);
    return;
  }

  hasTrack = true;
  loadingUrn = null;
  loadingSelectionKey = null;
  engineSelectionKey = getSelectionKey(track, queueIndex);
  usePlayerStore.setState({ downloadProgress: null });

  if (resumePosition > 0) {
    seek(resumePosition);
  }

  if (shouldPlay && !usePlayerStore.getState().isPlaying) {
    usePlayerStore.getState().resume();
  }

  const historyTrack =
    usePlayerStore.getState().currentTrack?.urn === track.urn
      ? usePlayerStore.getState().currentTrack
      : track;

  
  if (historyTrack?.urn && historyTrack.title && usePlayerStore.getState().repeat !== 'one') {
    api(
      '/history',
      {
        method: 'POST',
        body: JSON.stringify({
          scTrackId: historyTrack.urn,
          title: historyTrack.title,
          artistName: historyTrack.user?.username || '',
          artistUrn: historyTrack.user?.urn || null,
          artworkUrl: historyTrack.artwork_url || null,
          duration: historyTrack.duration || 0,
        }),
      },
      undefined,
      { silent: true },
    ).catch(() => {});
  }

  if (shouldPlay) {
    invoke('audio_play').catch(console.error);
    updatePlaybackState(true);
  } else {
    invoke('audio_pause').catch(console.error);
    updatePlaybackState(false);
  }
  updateMediaPosition();
  notify();
  preloadQueue();
  suppressPlaybackEnded(ENDED_TAIL_SUPPRESS_MS);
  crossfadeAdvanceScheduled = false;
  crossfadePreloadUrn = null;
}

async function hydrateTrackMetadata(track: Track, gen: number) {
  let nextTrack = await fetchFreshTrackMetadata(track);
  if (gen !== loadGen || loadingUrn !== track.urn) return;

  nextTrack = await resolveTrackMetadata(nextTrack);
  if (gen !== loadGen || loadingUrn !== track.urn) return;
  commitTrackMetadata(nextTrack);
}

function handleTrackEnd() {
  if (loadingUrn || isPlaybackEndedSuppressed()) return;

  const state = usePlayerStore.getState();
  if (state.playbackContext?.kind === 'vibe') {
    const dur = effectivePlaybackDuration();
    const tickFresh = performance.now() - lastTickAt < 2000;
    const sameTrack = !!state.currentTrack?.urn && state.currentTrack.urn === currentUrn;
    const atRealEnd =
      dur > 15 &&
      cachedTime >= 10 &&
      cachedTime >= dur - 0.25 &&
      cachedTime / dur >= 0.985;
    if (!tickFresh || !sameTrack || !atRealEnd) {
      suppressPlaybackEnded(3000);
      return;
    }
    void playNextVibeTrack();
    return;
  }
  if (state.repeat === 'one') {
    
    if (state.currentTrack) void loadTrack(state.currentTrack);
  } else {
    const { queue, queueIndex } = state;
    const isLast = queueIndex >= queue.length - 1;
    if (isLast && state.repeat === 'off' && queue.length > 0) {
      void autoplayRelated(queue[queueIndex]);
    } else {
      markAutoAdvanceCrossfade();
      usePlayerStore.getState().next();
    }
  }
}



listen<number>('audio:tick', (event) => {
  cachedTime = event.payload;
  syncTickSnapshot(event.payload);
  if (cachedDuration <= 0) cachedDuration = fallbackDuration;
  notify();

  if (currentUrn && cachedTime > 0) {
    const now = performance.now();
    if (now - lastResumePersistAt >= 2000) {
      lastResumePersistAt = now;
      savePlaybackResume(currentUrn, cachedTime);
    }
  }

  if (usePlayerStore.getState().playbackContext?.kind === 'vibe') return;

  const { crossfadeEnabled, crossfadeSeconds } = useSettingsStore.getState();
  if (!crossfadeEnabled || crossfadeSeconds < 1 || !hasTrack || loadingUrn) return;

  const duration = effectivePlaybackDuration();
  if (duration <= crossfadeSeconds + 0.5) return;
  if (!usePlayerStore.getState().isPlaying) return;

  const remaining = duration - cachedTime;
  const preloadLead = crossfadeSeconds + 30;

  if (remaining <= preloadLead && remaining > crossfadeSeconds + 0.5) {
    const nextTrack = peekNextQueueTrack();
    if (nextTrack && crossfadePreloadUrn !== nextTrack.urn) {
      crossfadePreloadUrn = nextTrack.urn;
      const hq = useSettingsStore.getState().highQualityStreaming;
      void ensureTrackCached(nextTrack.urn, hq).catch(() => {
        void ensureTrackCached(nextTrack.urn, false).catch(() => {});
      });
    }
  }

  if (
    !crossfadeAdvanceScheduled &&
    remaining > 0.2 &&
    remaining <= crossfadeSeconds
  ) {
    const playerState = usePlayerStore.getState();
    if (playerState.playbackContext?.kind === 'vibe') return;
    if (playerState.repeat === 'one') return;
    const isLast = playerState.queueIndex >= playerState.queue.length - 1;
    if (isLast && playerState.repeat === 'off') return;

    crossfadeAdvanceScheduled = true;
    suppressPlaybackEnded((crossfadeSeconds + 3) * 1000);
    lastEndedUrn = currentUrn;
    markAutoAdvanceCrossfade();
    playerState.next();
  }
});

listen<{ urn: string; progress: number }>('track:download-progress', (event) => {
  const { urn, progress } = event.payload;
  if (urn === currentUrn) {
    usePlayerStore.setState({ downloadProgress: progress });
  }
});

listen<{ urn: string; path: string; quality: PlaybackQuality }>(
  'track:quality-upgraded',
  async (event) => {
    const { urn, path, quality } = event.payload;
    if (urn !== currentUrn || !hasTrack) return;
    try {
      await invoke('audio_swap_source', {
        path,
        positionSecs: cachedTime,
        cacheKey: urn,
      });
      usePlayerStore.getState().setPlaybackTransport(quality, 'direct');
      console.log(`[Audio] swapped ${urn} → ${quality}`);
    } catch (err) {
      console.error('[Audio] swap_source failed:', err);
    }
  },
);

listen('audio:ended', () => {
  if (loadingUrn || isPlaybackEndedSuppressed()) return;

  if (currentUrn) {
    
    
    
    const playedEnough =
      cachedTime >= SKIP_THRESHOLD_SEC ||
      (cachedDuration > 0 && cachedTime >= cachedDuration * FULL_PLAY_RATIO);
    if (playedEnough) {
      const positionPct = cachedDuration > 0 ? Math.min(1, cachedTime / cachedDuration) : undefined;
      recordEvent('full_play', currentUrn, positionPct);
      const cluster = getUrnCluster(currentUrn);
      if (cluster) recordClusterFeedback(cluster, 'complete');
      clearPlaybackResume();
    }
    lastEndedUrn = currentUrn;
  }
  hasTrack = false;
  handleTrackEnd();
});

listen('audio:device-reconnected', () => {
  console.log('[Audio] Device reconnected');
});

listen<string>('audio:default-device-changed', (event) => {
  console.log(`[Audio] Default output changed to '${event.payload}'`);
});



usePlayerStore.subscribe((state, prev) => {
  const selectionKey = selectionKeyFromStore();
  const trackChanged =
    selectionKey !== null &&
    selectionKey !== loadingSelectionKey &&
    (selectionKey !== engineSelectionKey || !hasTrack);
  const playToggled = state.isPlaying !== prev.isPlaying;

  if (trackChanged) {
    const previousUrn = currentUrn;
    const previousTime = cachedTime;
    const previousHadTrack = hasTrack;

    if (
      previousUrn &&
      previousHadTrack &&
      previousTime < SKIP_THRESHOLD_SEC &&
      previousUrn !== lastEndedUrn
    ) {
      const previousDuration = cachedDuration > 0 ? cachedDuration : fallbackDuration;
      const positionPct = previousDuration > 0 ? previousTime / previousDuration : undefined;
      recordEvent('skip', previousUrn, positionPct);
    }
    lastEndedUrn = null;

    if (state.currentTrack) {
      updateMetadata(state.currentTrack);
      void loadTrack(state.currentTrack, state.isPlaying);
    } else {
      stopTrack();
      currentUrn = null;
      loadingUrn = null;
      loadingSelectionKey = null;
      engineSelectionKey = null;
      fallbackDuration = 0;
      cachedDuration = 0;
      usePlayerStore.setState({ downloadProgress: null });
      usePlayerStore.getState().setPlaybackTransport(null, null);
      notify();
    }
    return;
  }

  if (playToggled && !trackChanged) {
    if (state.isPlaying) {
      if (!hasTrack && state.currentTrack) {
        void loadTrack(state.currentTrack, true);
      } else if (hasTrack) {
        invoke('audio_play').catch(console.error);
        updatePlaybackState(true);
      }
    } else {
      if (state.currentTrack && currentUrn) {
        savePlaybackResume(state.currentTrack.urn, getCurrentTime());
      }
      invoke('audio_pause').catch(console.error);
      updatePlaybackState(false);
    }
  }

  if (state.volume !== prev.volume) {
    invoke('audio_set_volume', { volume: state.volume }).catch(console.error);
  }

  if (
    state.playbackRate !== prev.playbackRate ||
    state.pitchSemitones !== prev.pitchSemitones ||
    state.pitchControlMode !== prev.pitchControlMode
  ) {
    invoke('audio_set_playback_rate', { rate: getEffectivePlaybackRate() }).catch(console.error);
  }
});





function getEffectivePlaybackRate(): number {
  const { playbackRate, pitchControlMode, pitchSemitones } = usePlayerStore.getState();
  if (pitchControlMode === 'manual' && Math.abs(pitchSemitones) > 0.001) {
    return playbackRate * 2 ** (pitchSemitones / 12);
  }
  return playbackRate;
}



useSettingsStore.subscribe((state, prev) => {
  if (state.normalizeVolume !== prev.normalizeVolume) {
    invoke('audio_set_normalization', { enabled: state.normalizeVolume }).catch(console.error);
    if (usePlayerStore.getState().currentTrack) {
      void reloadCurrentTrack();
    }
  }
  if (state.eqEnabled !== prev.eqEnabled || state.eqGains !== prev.eqGains) {
    void applyEqFromSettings();
  }
});



function updateMetadata(track: Track, durationSecs?: number) {
  const coverUrl = art(track.artwork_url, 't500x500') || undefined;
  const display = getArtistDisplay(track);
  const title = getDisplayTitle(track);
  invoke('audio_set_metadata', {
    title,
    artist: display.primary || track.user.username,
    coverUrl: coverUrl || null,
    durationSecs: durationSecs ?? track.duration / 1000,
  }).catch(console.error);
}

function updatePlaybackState(playing: boolean) {
  invoke('audio_set_playback_state', { playing }).catch(console.error);
}

function updateMediaPosition() {
  const pos = getCurrentTime();
  if (pos > 0) {
    invoke('audio_set_media_position', { position: pos }).catch(console.error);
  }
}


listen('media:play', () => usePlayerStore.getState().resume());
listen('media:pause', () => usePlayerStore.getState().pause());
listen('media:toggle', () => usePlayerStore.getState().togglePlay());
listen('media:next', () => usePlayerStore.getState().next());
listen('media:prev', () => handlePrev());
listen<number>('media:seek', (e) => seek(e.payload));
listen<number>('media:seek-relative', (e) => {
  const offset = e.payload;
  if (offset > 0) {
    seek(Math.min(getCurrentTime() + offset, getDuration()));
  } else {
    seek(Math.max(getCurrentTime() + offset, 0));
  }
});



let autoplayLoading = false;

async function autoplayRelated(lastTrack: Track) {
  if (autoplayLoading) return;
  autoplayLoading = true;

  try {
    const { queue } = usePlayerStore.getState();
    const existingUrns = new Set(queue.map((t) => t.urn));
    const res = await api<{ collection: Track[] }>(
      `/tracks/${encodeURIComponent(lastTrack.urn)}/related?limit=20`,
    );
    const fresh = res.collection.filter((t) => !existingUrns.has(t.urn));
    if (fresh.length === 0) {
      usePlayerStore.getState().pause();
      return;
    }

    usePlayerStore.getState().addToQueue(fresh);
    usePlayerStore.getState().next();
  } catch (e) {
    console.error('Autoplay related failed:', e);
    usePlayerStore.getState().pause();
  } finally {
    autoplayLoading = false;
  }
}



let preloadTimer: ReturnType<typeof setTimeout> | null = null;

export function preloadTrack(urn: string) {
  if (preloadTimer) clearTimeout(preloadTimer);
  preloadTimer = setTimeout(() => {
    const sessionId = getSessionId();
    const hq = useSettingsStore.getState().highQualityStreaming;
    invoke('track_preload', {
      entries: [
        {
          urn,
          urls: streamFallbackUrls(urn, hq),
          downloadUrls: downloadFallbackUrls(urn, hq),
          storageUrls: buildStorageUrls(urn),
          sessionId,
          hq,
        },
      ],
    }).catch(console.error);
  }, 500);
}

export function preloadQueue() {
  const { queue, queueIndex, playbackContext } = usePlayerStore.getState();
  if (playbackContext?.kind === 'vibe') return;
  const entries: Array<{
    urn: string;
    urls: string[];
    downloadUrls: string[];
    storageUrls: string[];
    sessionId: string | null;
    hq: boolean;
  }> = [];
  const sessionId = getSessionId();
  const hq = useSettingsStore.getState().highQualityStreaming;

  for (let i = 1; i <= 3; i++) {
    const idx = queueIndex + i;
    if (idx < queue.length) {
      entries.push({
        urn: queue[idx].urn,
        urls: streamFallbackUrls(queue[idx].urn, hq),
        downloadUrls: downloadFallbackUrls(queue[idx].urn, hq),
        storageUrls: buildStorageUrls(queue[idx].urn),
        sessionId,
        hq,
      });
    }
  }

  if (entries.length > 0) {
    invoke('track_preload', { entries }).catch(console.error);
  }
}

usePlayerStore.subscribe((state, prev) => {
  if (state.queueIndex !== prev.queueIndex || state.queue !== prev.queue) {
    preloadQueue();
  }
});
