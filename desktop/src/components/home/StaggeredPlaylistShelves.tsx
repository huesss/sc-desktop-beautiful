import React, { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { PlaylistSearchShelf } from './PlaylistSearchShelf';

export const StaggeredPlaylistShelves = React.memo(function StaggeredPlaylistShelves() {
  const keywords = useSettingsStore((s) => s.playlistKeywords);
  const queries = useMemo(
    () => keywords.map((q, i) => ({ id: `kw-${i}`, q, title: q })),
    [keywords],
  );
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set([queries[0]?.id].filter(Boolean) as string[]),
  );

  useEffect(() => {
    setEnabledIds(new Set([queries[0]?.id].filter(Boolean) as string[]));
    let index = 1;
    const timer = window.setInterval(() => {
      if (index >= queries.length) {
        clearInterval(timer);
        return;
      }
      const id = queries[index].id;
      setEnabledIds((prev) => new Set([...prev, id]));
      index += 1;
    }, 1600);
    return () => clearInterval(timer);
  }, [queries]);

  return (
    <>
      {queries.map(({ id, q, title }) => (
        <PlaylistSearchShelf key={id} query={q} title={title} enabled={enabledIds.has(id)} />
      ))}
    </>
  );
});
