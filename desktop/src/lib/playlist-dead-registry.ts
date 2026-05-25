import type { QueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { purgePlaylistFromCache } from './playlist-cache';

const DEAD_KEY = 'sc-dead-playlists';
const ALIVE_TTL_MS = 1000 * 60 * 5;

const deadUrns = new Set<string>();
const aliveUntil = new Map<string, number>();

function readStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function loadDeadFromStorage() {
  const storage = readStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(DEAD_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as string[];
    if (Array.isArray(list)) {
      for (const urn of list) deadUrns.add(urn);
    }
  } catch {}
}

function persistDeadToStorage() {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(DEAD_KEY, JSON.stringify([...deadUrns].slice(-500)));
  } catch {}
}

loadDeadFromStorage();

export function isPlaylistKnownDead(urn: string): boolean {
  return deadUrns.has(urn);
}

function isPlaylistKnownAlive(urn: string): boolean {
  const until = aliveUntil.get(urn);
  return until != null && until > Date.now();
}

export function markPlaylistDead(urn: string, qc?: QueryClient) {
  deadUrns.add(urn);
  aliveUntil.delete(urn);
  persistDeadToStorage();
  qc?.invalidateQueries({ queryKey: ['playlist', urn] });
  if (qc) purgePlaylistFromCache(qc, urn);
}

function markPlaylistAlive(urn: string) {
  aliveUntil.set(urn, Date.now() + ALIVE_TTL_MS);
}

type PlaylistProbe = {
  urn?: string;
  title?: string;
  track_count?: number;
};

type TracksProbe = { collection?: unknown[] };

function isHttpGone(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 410 || error.status === 403)
  );
}

async function verifyPlaylistExists(urn: string, qc?: QueryClient): Promise<boolean> {
  if (isPlaylistKnownDead(urn)) return false;
  if (isPlaylistKnownAlive(urn)) return true;

  try {
    const playlist = await api<PlaylistProbe>(
      `/playlists/${encodeURIComponent(urn)}?show_tracks=false&access=playable,preview,blocked`,
      {},
      undefined,
      { silent: true },
    );

    if (!playlist?.urn || !playlist.title?.trim()) {
      markPlaylistDead(urn, qc);
      return false;
    }

    try {
      await api<TracksProbe>(
        `/playlists/${encodeURIComponent(urn)}/tracks?limit=1&access=playable,preview,blocked`,
        {},
        undefined,
        { silent: true },
      );
    } catch (tracksError) {
      if (isHttpGone(tracksError)) {
        markPlaylistDead(urn, qc);
        return false;
      }
    }

    markPlaylistAlive(urn);
    return true;
  } catch (error) {
    if (isHttpGone(error)) {
      markPlaylistDead(urn, qc);
      return false;
    }
    return true;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

type PlaylistRef = { urn: string };

export async function isPlaylistReachable(urn: string, qc?: QueryClient): Promise<boolean> {
  if (isPlaylistKnownDead(urn)) return false;
  return verifyPlaylistExists(urn, qc);
}

export async function filterExistingPlaylists<T extends PlaylistRef>(
  playlists: T[],
  qc?: QueryClient,
): Promise<T[]> {
  const prefiltered = playlists.filter((p) => !isPlaylistKnownDead(p.urn));
  if (prefiltered.length === 0) return [];

  const knownAlive: T[] = [];
  const toCheck: T[] = [];

  for (const playlist of prefiltered) {
    if (isPlaylistKnownAlive(playlist.urn)) {
      knownAlive.push(playlist);
    } else {
      toCheck.push(playlist);
    }
  }

  if (toCheck.length === 0) return knownAlive;

  const checked = await mapLimit(toCheck, 4, async (playlist) => {
    const ok = await verifyPlaylistExists(playlist.urn, qc);
    return ok ? playlist : null;
  });

  return [...knownAlive, ...checked.filter((p): p is T => p != null)];
}
