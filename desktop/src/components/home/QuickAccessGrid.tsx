import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { art } from '../../lib/formatters';
import { dedupeByUrn, type Playlist } from '../../lib/hooks';
import { ListMusic, MyScIcon } from '../../lib/icons';
import { refreshPlaylistListCaches } from '../../lib/playlist-cache';
import { markPlaylistDead } from '../../lib/playlist-dead-registry';
import { useVerifiedPlaylists } from '../../lib/playlist-verify';
import { useSettingsStore } from '../../stores/settings';
import type { SidebarPinnedPlaylist } from '../../stores/settings';
import type { Track } from '../../stores/player';
import { usePlayerStore } from '../../stores/player';

const TILE_COLORS = [
  '#1e3264',
  '#8b5a2b',
  '#135a45',
  '#50387f',
  '#8c1932',
  '#27856a',
  '#3d5a40',
  '#bc5908',
];

type QuickTileIcon = React.ComponentType<{ size?: number; className?: string }>;

type QuickTile = {
  id: string;
  title: string;
  cover: string | null;
  color: string;
  onClick: () => void;
  playlistUrn?: string;
  icon?: QuickTileIcon;
};

function pinAsPlaylist(pin: SidebarPinnedPlaylist, pool: Playlist[]): Playlist | null {
  const existing = pool.find((p) => p.urn === pin.urn);
  if (existing) return existing;
  return {
    urn: pin.urn,
    title: pin.title,
    artwork_url: pin.artworkUrl,
    tracks: [],
    track_count: 0,
    likes_count: 0,
  } as unknown as Playlist;
}

function QuickAccessTile({
  tile,
  onUnavailable,
}: {
  tile: QuickTile;
  onUnavailable?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={tile.onClick}
      className="group flex min-h-[64px] items-center gap-3 overflow-hidden rounded-md bg-[#ffffff14] p-2 text-left transition-colors hover:bg-[#ffffff20] cursor-pointer"
      style={{ backgroundColor: tile.cover ? undefined : tile.color }}
    >
      {tile.cover ? (
        <img
          src={tile.cover}
          alt=""
          className="size-14 shrink-0 rounded-sm object-cover shadow-md"
          decoding="async"
          onError={() => onUnavailable?.()}
        />
      ) : (
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-black/25"
          style={{ backgroundColor: tile.color }}
        >
          {tile.icon ? (
            <tile.icon size={26} className="text-white/80" />
          ) : (
            <ListMusic size={22} className="text-white/80" />
          )}
        </div>
      )}
      <span className="min-w-0 flex-1 text-[13px] font-bold leading-tight text-white line-clamp-2">
        {tile.title}
      </span>
    </button>
  );
}

export const QuickAccessGrid = React.memo(function QuickAccessGrid({
  feedTracks,
  likedCover,
  likedPlaylists,
  myPlaylists,
}: {
  feedTracks: Track[];
  likedCover: string | null;
  likedPlaylists: Playlist[];
  myPlaylists: Playlist[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const didRefresh = useRef(false);
  const pinned = useSettingsStore((s) => s.pinnedPlaylists);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;
    refreshPlaylistListCaches(qc);
  }, [qc]);
  const unpinPlaylist = useSettingsStore((s) => s.unpinPlaylist);
  const [hiddenUrns, setHiddenUrns] = useState<Set<string>>(() => new Set());

  const candidates = useMemo(() => {
    const merged = dedupeByUrn([...likedPlaylists, ...myPlaylists]);
    for (const pin of pinned) {
      if (merged.some((p) => p.urn === pin.urn)) continue;
      const stub = pinAsPlaylist(pin, merged);
      if (stub) merged.push(stub);
    }
    return merged;
  }, [likedPlaylists, myPlaylists, pinned]);

  const { playlists: verified, verifying } = useVerifiedPlaylists(
    candidates,
    candidates.length > 0,
  );

  React.useEffect(() => {
    if (verifying || candidates.length === 0) return;
    const alive = new Set(verified.map((p) => p.urn));
    for (const pin of pinned) {
      if (!alive.has(pin.urn)) unpinPlaylist(pin.urn);
    }
  }, [verifying, verified, pinned, candidates.length, unpinPlaylist]);

  const alivePlaylists = useMemo(
    () => verified.filter((p) => !hiddenUrns.has(p.urn)),
    [verified, hiddenUrns],
  );

  const aliveUrns = useMemo(() => new Set(alivePlaylists.map((p) => p.urn)), [alivePlaylists]);

  const hidePlaylist = useCallback(
    (urn: string) => {
      markPlaylistDead(urn, qc);
      unpinPlaylist(urn);
      setHiddenUrns((prev) => {
        if (prev.has(urn)) return prev;
        const next = new Set(prev);
        next.add(urn);
        return next;
      });
    },
    [qc, unpinPlaylist],
  );

  const tiles = useMemo(() => {
    const out: QuickTile[] = [];
    let colorIdx = 0;
    const nextColor = () => TILE_COLORS[colorIdx++ % TILE_COLORS.length];

    out.push({
      id: 'likes',
      title: t('home.quickLikes'),
      cover: likedCover,
      color: '#450a0a',
      onClick: () => navigate('/likes'),
    });

    out.push({
      id: 'my-sc',
      title: t('mySc.title'),
      cover: null,
      color: '#1e3264',
      icon: MyScIcon,
      onClick: () => navigate('/vibe'),
    });

    out.push({
      id: 'library',
      title: t('nav.library'),
      cover: null,
      color: nextColor(),
      onClick: () => navigate('/library'),
    });

    const cs2 = alivePlaylists.find((p) => /cs2|faceit|counter.?strike/i.test(p.title));
    if (cs2) {
      out.push({
        id: 'cs2',
        title: cs2.title,
        cover:
          art(cs2.artwork_url, 't200x200') ?? art(cs2.tracks?.[0]?.artwork_url, 't200x200'),
        color: nextColor(),
        playlistUrn: cs2.urn,
        onClick: () => navigate(`/playlist/${encodeURIComponent(cs2.urn)}`),
      });
    }

    for (const pin of pinned.slice(0, 2)) {
      if (!aliveUrns.has(pin.urn)) continue;
      const pl = alivePlaylists.find((p) => p.urn === pin.urn);
      out.push({
        id: `pin-${pin.urn}`,
        title: pl?.title ?? pin.title,
        cover:
          art(pl?.artwork_url ?? pin.artworkUrl, 't200x200') ??
          art(pl?.tracks?.[0]?.artwork_url, 't200x200'),
        color: nextColor(),
        playlistUrn: pin.urn,
        onClick: () => navigate(`/playlist/${encodeURIComponent(pin.urn)}`),
      });
    }

    const seen = new Set(out.map((x) => x.id));
    for (const pl of alivePlaylists) {
      if (out.length >= 8) break;
      if (cs2 && pl.urn === cs2.urn) continue;
      const id = `pl-${pl.urn}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        title: pl.title,
        cover:
          art(pl.artwork_url, 't200x200') ?? art(pl.tracks?.[0]?.artwork_url, 't200x200'),
        color: nextColor(),
        playlistUrn: pl.urn,
        onClick: () => navigate(`/playlist/${encodeURIComponent(pl.urn)}`),
      });
    }

    if (feedTracks.length > 0) {
      out.push({
        id: 'shuffle-feed',
        title: t('home.quickShuffle'),
        cover: art(feedTracks[0]?.artwork_url, 't200x200'),
        color: nextColor(),
        onClick: () => {
          const shuffled = [...feedTracks];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          if (shuffled[0]) usePlayerStore.getState().play(shuffled[0], shuffled);
        },
      });
    }

    return out.slice(0, 8);
  }, [t, navigate, likedCover, pinned, alivePlaylists, aliveUrns, feedTracks]);

  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-[15px] font-bold tracking-tight text-white">{t('home.quickAccess')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <QuickAccessTile
            key={tile.id}
            tile={tile}
            onUnavailable={
              tile.playlistUrn ? () => hidePlaylist(tile.playlistUrn!) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
});
