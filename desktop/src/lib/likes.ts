import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useAuthStore } from '../stores/auth';
import type { Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';
import { recordEvent } from './events';
import { isVibeRoute, triggerVibeLikeFlash } from './vibe-like-flash';

interface PagedTracks {
  collection: Track[];
  page: number;
  page_size: number;
  has_more: boolean;
}



const _likedUrns = new Map<string, boolean>();
const _listeners = new Set<() => void>();

function notify() {
  for (const l of _listeners) l();
}


export function initLikedUrns(tracks: Track[]) {
  let changed = false;
  for (const t of tracks) {
    if (!_likedUrns.has(t.urn)) {
      _likedUrns.set(t.urn, true);
      changed = true;
    }
  }
  if (changed) notify();
}


export function setLikedUrn(urn: string, liked: boolean) {
  if (liked) {
    _likedUrns.set(urn, true);
  } else {
    _likedUrns.delete(urn);
  }
  notify();
}


export function isUrnLiked(urn: string): boolean {
  return _likedUrns.has(urn);
}


export function useLiked(urn: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      _listeners.add(cb);
      return () => _listeners.delete(cb);
    },
    () => _likedUrns.has(urn),
  );
}



export function optimisticToggleLike(qc: QueryClient, track: Track, nowLiked: boolean) {
  
  setLikedUrn(track.urn, nowLiked);

  if (nowLiked) {
    recordEvent('like', track.urn);
    const ctx = usePlayerStore.getState().playbackContext;
    if (ctx?.kind === 'vibe' || isVibeRoute()) {
      triggerVibeLikeFlash();
    }
  }

  
  const { user } = useAuthStore.getState();
  if (user) {
    useAuthStore.setState({
      user: { ...user, public_favorites_count: user.public_favorites_count + (nowLiked ? 1 : -1) },
    });
  }

  
  qc.setQueriesData<{ pages: PagedTracks[]; pageParams: unknown[] }>(
    { queryKey: ['me', 'likes', 'tracks'] },
    (old) => {
      if (!old?.pages) return old;
      if (nowLiked) {
        const pages = [...old.pages];
        pages[0] = {
          ...pages[0],
          collection: [track, ...pages[0].collection.filter((t) => t.urn !== track.urn)],
        };
        return { ...old, pages };
      }
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          collection: page.collection.filter((t) => t.urn !== track.urn),
        })),
      };
    },
  );

  
  qc.setQueryData<Track>(['track', track.urn], (old) => {
    if (!old) return old;
    return { ...old, user_favorite: nowLiked };
  });

  
  
  
  
  setTimeout(() => {
    qc.invalidateQueries({ queryKey: ['track', track.urn], exact: true });
  }, 5000);
}
