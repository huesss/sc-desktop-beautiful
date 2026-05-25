import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { filterExistingPlaylists, isPlaylistKnownDead } from './playlist-dead-registry';

type PlaylistRef = { urn: string };

export { filterExistingPlaylists, isPlaylistKnownDead, markPlaylistDead } from './playlist-dead-registry';

export function useVerifiedPlaylists<T extends PlaylistRef>(playlists: T[], enabled = true) {
  const qc = useQueryClient();
  const [visible, setVisible] = useState<T[]>(() =>
    playlists.filter((p) => !isPlaylistKnownDead(p.urn)),
  );
  const [verifying, setVerifying] = useState(false);
  const urnKey = playlists.map((p) => p.urn).join('\n');

  useEffect(() => {
    const initial = playlists.filter((p) => !isPlaylistKnownDead(p.urn));
    setVisible(initial);

    if (!enabled || playlists.length === 0) {
      setVerifying(false);
      return;
    }

    let cancelled = false;
    setVerifying(true);

    void filterExistingPlaylists(playlists, qc).then((result) => {
      if (cancelled) return;
      setVisible(result);
      setVerifying(false);
    });

    return () => {
      cancelled = true;
    };
  }, [urnKey, enabled, qc]);

  return { playlists: visible, verifying };
}
