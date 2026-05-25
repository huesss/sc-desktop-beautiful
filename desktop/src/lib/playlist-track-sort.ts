import { getArtistDisplay } from './track-display';
import type { Track } from '../stores/player';

export type PlaylistSortField = 'artist' | 'album' | 'date';
export type PlaylistSortDir = 'asc' | 'desc';

export type PlaylistSortState = {
  field: PlaylistSortField;
  dir: PlaylistSortDir;
} | null;

export function cyclePlaylistSort(
  prev: PlaylistSortState,
  field: PlaylistSortField,
): PlaylistSortState {
  if (!prev || prev.field !== field) return { field, dir: 'asc' };
  if (prev.dir === 'asc') return { field, dir: 'desc' };
  return null;
}

function trackAlbumLabel(track: Track): string {
  return track.enrichment?.album?.title?.trim() || '';
}

function trackCreatedMs(track: Track): number {
  if (!track.created_at) return 0;
  const d = new Date(track.created_at.replace(/\//g, '-').replace(' +0000', 'Z'));
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function sortPlaylistTracks(tracks: Track[], sort: PlaylistSortState): Track[] {
  if (!sort) return tracks;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    let cmp = 0;
    if (sort.field === 'artist') {
      cmp = getArtistDisplay(a).primary.localeCompare(getArtistDisplay(b).primary, undefined, {
        sensitivity: 'base',
      });
    } else if (sort.field === 'album') {
      cmp = trackAlbumLabel(a).localeCompare(trackAlbumLabel(b), undefined, {
        sensitivity: 'base',
      });
    } else {
      cmp = trackCreatedMs(a) - trackCreatedMs(b);
    }
    if (cmp === 0) {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
    return cmp * sign;
  });
}
