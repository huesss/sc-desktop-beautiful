import type { InfiniteData, QueryClient } from '@tanstack/react-query';

type PagedCollection<T> = { collection: T[] };

function stripFromPages<T extends { urn: string }>(
  old: InfiniteData<PagedCollection<T>> | undefined,
  playlistUrn: string,
): InfiniteData<PagedCollection<T>> | undefined {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      collection: page.collection.filter((p) => p.urn !== playlistUrn),
    })),
  };
}

function stripFromFeedPages(
  old: InfiniteData<PagedCollection<{ origin: { urn?: string } }>> | undefined,
  playlistUrn: string,
): InfiniteData<PagedCollection<{ origin: { urn?: string } }>> | undefined {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      collection: page.collection.filter((item) => item.origin?.urn !== playlistUrn),
    })),
  };
}

export function purgePlaylistFromCache(qc: QueryClient, playlistUrn: string) {
  qc.removeQueries({ queryKey: ['playlist', playlistUrn] });
  qc.removeQueries({ queryKey: ['playlist', playlistUrn, 'tracks'] });

  qc.setQueriesData<InfiniteData<PagedCollection<{ urn: string }>>>(
    { queryKey: ['me', 'playlists'] },
    (old) => stripFromPages(old, playlistUrn),
  );
  qc.setQueriesData<InfiniteData<PagedCollection<{ urn: string }>>>(
    { queryKey: ['me', 'likes', 'playlists'] },
    (old) => stripFromPages(old, playlistUrn),
  );
  qc.setQueriesData<InfiniteData<PagedCollection<{ origin: { urn?: string } }>>>(
    { queryKey: ['feed'] },
    (old) => stripFromFeedPages(old, playlistUrn),
  );

  qc.setQueriesData<InfiniteData<PagedCollection<{ urn: string }>>>(
    {
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        (q.queryKey[0] === 'user' || q.queryKey[0] === 'search') &&
        q.queryKey.includes('playlists'),
    },
    (old) => stripFromPages(old, playlistUrn),
  );
}

export function refreshPlaylistListCaches(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['me', 'playlists'] });
  void qc.invalidateQueries({ queryKey: ['me', 'likes', 'playlists'] });
  void qc.invalidateQueries({ queryKey: ['feed'] });
  void qc.invalidateQueries({ queryKey: ['search', 'playlists'] });
  void qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) && q.queryKey[0] === 'user' && q.queryKey.includes('playlists'),
  });
}
