import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HOME_PLAYLIST_QUERIES } from './playlist-queries';
import { PlaylistSearchShelf } from './PlaylistSearchShelf';

export const StaggeredPlaylistShelves = React.memo(function StaggeredPlaylistShelves() {
  const { t } = useTranslation();
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set([HOME_PLAYLIST_QUERIES[0]?.id].filter(Boolean) as string[]),
  );

  useEffect(() => {
    let index = 1;
    const timer = window.setInterval(() => {
      if (index >= HOME_PLAYLIST_QUERIES.length) {
        clearInterval(timer);
        return;
      }
      const id = HOME_PLAYLIST_QUERIES[index].id;
      setEnabledIds((prev) => new Set([...prev, id]));
      index += 1;
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {HOME_PLAYLIST_QUERIES.map(({ id, q }) => (
        <PlaylistSearchShelf
          key={id}
          query={q}
          title={t(`home.playlistShelf.${id}`)}
          enabled={enabledIds.has(id)}
        />
      ))}
    </>
  );
});
