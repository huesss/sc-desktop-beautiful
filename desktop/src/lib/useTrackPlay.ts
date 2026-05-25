import { useCallback, useEffect, useRef } from 'react';
import type { PlaybackContext } from './playback-context';
import { contextsMatch } from './playback-context';
import { type Track, usePlayerStore } from '../stores/player';
import { rememberTracks } from './offline-index';

export function useTrackPlay(track: Track, queue?: Track[], context?: PlaybackContext | null) {
  const matchesContext = (s: ReturnType<typeof usePlayerStore.getState>) =>
    context == null
      ? true
      : !!s.playbackContext && contextsMatch(s.playbackContext, context);

  const isThis = usePlayerStore(
    (s) => s.currentTrack?.urn === track.urn && matchesContext(s),
  );
  const isThisPlaying = usePlayerStore(
    (s) => s.isPlaying && s.currentTrack?.urn === track.urn && matchesContext(s),
  );

  const trackRef = useRef(track);
  const queueRef = useRef(queue);
  const contextRef = useRef(context);
  trackRef.current = track;
  queueRef.current = queue;
  contextRef.current = context;

  useEffect(() => {
    void rememberTracks([track]);
  }, [track]);

  const togglePlay = useCallback(() => {
    const { play, pause, resume } = usePlayerStore.getState();
    if (isThisPlaying) pause();
    else if (isThis) resume();
    else play(trackRef.current, queueRef.current ?? [trackRef.current], contextRef.current ?? null);
  }, [isThis, isThisPlaying]);

  return { isThis, isThisPlaying, togglePlay };
}

export function useIsPlayingFrom(trackUrns: Set<string>, context?: PlaybackContext | null) {
  return usePlayerStore((s) => {
    if (!s.isPlaying || !s.currentTrack || !trackUrns.has(s.currentTrack.urn)) return false;
    if (context == null) return true;
    if (!s.playbackContext) return false;
    return contextsMatch(s.playbackContext, context);
  });
}
