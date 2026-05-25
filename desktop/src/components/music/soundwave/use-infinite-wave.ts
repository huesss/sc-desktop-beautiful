import { useEffect, useRef } from 'react';
import type { Track } from '../../../stores/player';
import { usePlayerStore } from '../../../stores/player';

















export function useInfiniteWave(opts: {
  enabled: boolean;
  tracks: Track[];
  fetchMore: () => Promise<Track[]>;
  minTail?: number;
}) {
  const { enabled, tracks, fetchMore, minTail = 3 } = opts;

  
  
  const ownedRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const fetchMoreRef = useRef(fetchMore);

  useEffect(() => {
    fetchMoreRef.current = fetchMore;
  }, [fetchMore]);

  
  
  useEffect(() => {
    for (const t of tracks) ownedRef.current.add(t.urn);
  }, [tracks]);

  useEffect(() => {
    if (!enabled) return;

    return usePlayerStore.subscribe((state) => {
      const { queue, queueIndex, currentTrack } = state;
      if (!currentTrack) return;
      if (!ownedRef.current.has(currentTrack.urn)) return;
      const remaining = queue.length - queueIndex - 1;
      if (remaining > minTail) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      (async () => {
        try {
          const next = await fetchMoreRef.current();
          const existing = new Set(usePlayerStore.getState().queue.map((t) => t.urn));
          const fresh = next.filter((t) => !existing.has(t.urn));
          if (fresh.length > 0) {
            usePlayerStore.getState().addToQueue(fresh);
            for (const t of fresh) ownedRef.current.add(t.urn);
          }
        } catch (e) {
          console.debug('[soundwave] infinite refill failed:', e);
        } finally {
          fetchingRef.current = false;
        }
      })();
    });
  }, [enabled, minTail]);
}
