import { usePlayerStore } from '../stores/player';

export type PlaybackContext =
  | { kind: 'likes' }
  | { kind: 'playlist'; urn: string }
  | { kind: 'album'; id: string }
  | { kind: 'artist'; id: string }
  | { kind: 'user'; urn: string }
  | { kind: 'home' }
  | { kind: 'search' }
  | { kind: 'track' }
  | { kind: 'queue' }
  | { kind: 'vibe'; urn: string };

export function contextsMatch(a: PlaybackContext, b: PlaybackContext): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'playlist':
      return a.urn === (b as Extract<PlaybackContext, { kind: 'playlist' }>).urn;
    case 'album':
      return a.id === (b as Extract<PlaybackContext, { kind: 'album' }>).id;
    case 'artist':
      return a.id === (b as Extract<PlaybackContext, { kind: 'artist' }>).id;
    case 'user':
      return a.urn === (b as Extract<PlaybackContext, { kind: 'user' }>).urn;
    case 'vibe':
      return a.urn === (b as Extract<PlaybackContext, { kind: 'vibe' }>).urn;
    default:
      return true;
  }
}

export function useIsPlayingInContext(context: PlaybackContext | null, trackUrns?: Set<string>) {
  return usePlayerStore((s) => {
    if (!s.isPlaying || !s.currentTrack) return false;
    if (trackUrns && !trackUrns.has(s.currentTrack.urn)) return false;
    if (!context || !s.playbackContext) return false;
    return contextsMatch(s.playbackContext, context);
  });
}

export function useIsPausedInContext(context: PlaybackContext | null, trackUrns?: Set<string>) {
  return usePlayerStore((s) => {
    if (s.isPlaying || !s.currentTrack) return false;
    if (trackUrns && !trackUrns.has(s.currentTrack.urn)) return false;
    if (!context || !s.playbackContext) return false;
    return contextsMatch(s.playbackContext, context);
  });
}

export function usePlaybackInContext(context: PlaybackContext | null, trackUrns?: Set<string>) {
  const isPlaying = useIsPlayingInContext(context, trackUrns);
  const isPaused = useIsPausedInContext(context, trackUrns);
  return { isPlayingFromThis: isPlaying, isPausedFromThis: isPaused };
}
