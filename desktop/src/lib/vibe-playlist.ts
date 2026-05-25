import { api } from './api';
import type { PagedResponse } from './hooks';
import { normalizePlaylistTracks, type Playlist } from './hooks';
import type { Track } from '../stores/player';
import { usePlayerStore } from '../stores/player';

const PLAYLIST_SEARCH = 'cs2 faceit playlist';
const TRACK_PAGE_LIMIT = 200;
const MAX_TRACK_PAGES = 10;
const TOP_PLAYLIST_POOL = 5;

let vibeTracks: Track[] = [];
let vibePlaylistUrn = 'vibe-mix';
let vibeLoading: Promise<Track[]> | null = null;
let vibeAdvancing = false;
let lastVibeAdvanceAt = 0;
let vibeBuckets: { urn: string; tracks: Track[] }[] = [];

function resetVibeCache() {
  vibeTracks = [];
  vibePlaylistUrn = 'vibe-mix';
  vibeLoading = null;
  vibeBuckets = [];
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomTrack(tracks: Track[], excludeUrn?: string | null): Track {
  const pool = excludeUrn ? tracks.filter((t) => t.urn !== excludeUrn) : tracks;
  const list = pool.length > 0 ? pool : tracks;
  return pickRandom(list);
}

function shuffleTracks<T>(tracks: T[]): T[] {
  const list = [...tracks];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.urn)) return false;
    seen.add(t.urn);
    return true;
  });
}

function buildVibeQueue(head?: Track | null): Track[] {
  const buckets = vibeBuckets.length > 0 ? vibeBuckets : [{ urn: vibePlaylistUrn, tracks: vibeTracks }];
  const shuffledBuckets = shuffleTracks(buckets)
    .map((b) => ({ ...b, tracks: shuffleTracks(b.tracks) }))
    .filter((b) => b.tracks.length > 0);
  const queue: Track[] = [];
  let index = 0;

  while (shuffledBuckets.some((b) => index < b.tracks.length)) {
    for (const bucket of shuffledBuckets) {
      const track = bucket.tracks[index];
      if (track) queue.push(track);
    }
    index += 1;
  }

  const unique = dedupeTracks(queue);
  if (!head) return unique;
  return [head, ...unique.filter((t) => t.urn !== head.urn)];
}

function shuffleQueue(tracks: Track[], head: Track): Track[] {
  const rest = buildVibeQueue(head).filter((t) => t.urn !== head.urn);
  if (rest.length > 0) return [head, ...rest];
  const fallback = tracks.filter((t) => t.urn !== head.urn);
  for (let i = fallback.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
  }
  return [head, ...fallback];
}

async function fetchPlaylistTracks(urn: string): Promise<Track[]> {
  const all: Track[] = [];
  for (let page = 0; page < MAX_TRACK_PAGES; page++) {
    const data = await api<PagedResponse<Track>>(
      `/playlists/${encodeURIComponent(urn)}/tracks?limit=${TRACK_PAGE_LIMIT}&page=${page}&access=playable,preview,blocked`,
    );
    const batch = normalizePlaylistTracks(data.collection ?? []).filter((t) => t.duration > 0);
    all.push(...batch);
    if (!data.has_more || batch.length === 0) break;
  }
  const seen = new Set<string>();
  return all.filter((t) => {
    if (seen.has(t.urn)) return false;
    seen.add(t.urn);
    return true;
  });
}

function scorePlaylist(p: Playlist): number {
  const title = p.title.toLowerCase();
  let score = 0;
  if (/cs2|csgo|counter.?strike/.test(title)) score += 3;
  if (/faceit/.test(title)) score += 3;
  if (/playlist|mix|music|плейлист/.test(title)) score += 1;
  if (/finder|track your/.test(title)) score -= 3;
  if ((p.track_count ?? 0) < 3) score -= 2;
  score += Math.min(2, Math.log10(Math.max(1, p.track_count ?? 1)));
  return score;
}

function pickTopPlaylists(playlists: Playlist[], count: number): Playlist[] {
  return [...playlists]
    .map((p) => ({ p, score: scorePlaylist(p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p);
}

async function resolveVibePlaylist(): Promise<{ urn: string; tracks: Track[] }> {
  const res = await api<PagedResponse<Playlist>>(
    `/playlists?q=${encodeURIComponent(PLAYLIST_SEARCH)}&limit=40&page=0`,
  );
  const all = res.collection ?? [];
  const top = pickTopPlaylists(all, TOP_PLAYLIST_POOL);
  const pool = top.length > 0 ? top : all.slice(0, TOP_PLAYLIST_POOL);
  if (pool.length === 0) throw new Error('CS2 Faceit playlist not found');

  const loaded = (
    await Promise.all(
      pool.map(async (playlist) => {
        const tracks = await fetchPlaylistTracks(playlist.urn);
        return { urn: playlist.urn, tracks };
      }),
    )
  ).filter((p) => p.tracks.length > 0);
  if (loaded.length === 0) throw new Error('Playlist has no tracks');

  vibeBuckets = loaded;
  vibePlaylistUrn = loaded.map((p) => p.urn).join(',');
  vibeTracks = buildVibeQueue();
  return { urn: vibePlaylistUrn, tracks: vibeTracks };
}

export async function ensureVibePlaylistLoaded(): Promise<Track[]> {
  if (vibeTracks.length > 0) return vibeTracks;
  if (vibeLoading) return vibeLoading;
  vibeLoading = resolveVibePlaylist()
    .then((r) => r.tracks)
    .finally(() => {
      vibeLoading = null;
    });
  return vibeLoading;
}

export function getVibeTracks() {
  return vibeTracks;
}

function playVibeTrack(track: Track, tracks: Track[]) {
  const queue = shuffleQueue(tracks, track);
  usePlayerStore.getState().play(track, queue, { kind: 'vibe', urn: vibePlaylistUrn });
}

export async function playRandomVibeTrack() {
  resetVibeCache();
  const tracks = await ensureVibePlaylistLoaded();
  const track = pickRandomTrack(tracks);
  playVibeTrack(track, tracks);
}

export function skipVibeTrack() {
  const state = usePlayerStore.getState();
  if (state.playbackContext?.kind !== 'vibe') return;
  if (state.queue.length <= 1) {
    void pickNewVibeTrack(true);
    return;
  }
  if (state.queueIndex < state.queue.length - 1) {
    state.next();
    return;
  }
  void pickNewVibeTrack(true);
}

export function prevVibeTrack() {
  const state = usePlayerStore.getState();
  if (state.playbackContext?.kind !== 'vibe') return;
  if (state.queue.length <= 1) {
    void pickNewVibeTrack(false);
    return;
  }
  if (state.queueIndex > 0) {
    state.prev();
    return;
  }
  usePlayerStore.getState().playFromQueue(state.queue.length - 1);
}

async function pickNewVibeTrack(excludeCurrent: boolean) {
  const tracks = await ensureVibePlaylistLoaded();
  const current = usePlayerStore.getState().currentTrack;
  const track = pickRandomTrack(tracks, excludeCurrent ? current?.urn : null);
  playVibeTrack(track, tracks);
}

export async function playNextVibeTrack() {
  const now = performance.now();
  if (vibeAdvancing || now - lastVibeAdvanceAt < 2000) return;
  vibeAdvancing = true;
  lastVibeAdvanceAt = now;
  try {
    const state = usePlayerStore.getState();
    if (state.playbackContext?.kind !== 'vibe') return;

    const { queue, queueIndex } = state;
    if (queue.length <= 1) {
      await pickNewVibeTrack(true);
      return;
    }

    if (queueIndex < queue.length - 1) {
      usePlayerStore.getState().next();
      return;
    }

    await pickNewVibeTrack(true);
  } finally {
    vibeAdvancing = false;
  }
}
