import { api } from './api';

function urnIdsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const idA = a.split(':').pop();
  const idB = b.split(':').pop();
  return !!idA && !!idB && idA === idB;
}

export async function fetchIsFollowing(viewerUrn: string, targetUrn: string): Promise<boolean> {
  try {
    const res = await api<boolean | { urn?: string }>(
      `/users/${encodeURIComponent(viewerUrn)}/followings/${encodeURIComponent(targetUrn)}`,
      {},
      undefined,
      { silent: true },
    );
    if (typeof res === 'boolean') return res;
    if (res && typeof res === 'object' && res.urn) {
      return urnIdsMatch(res.urn, targetUrn);
    }
  } catch {}

  for (let page = 0; page < 4; page++) {
    try {
      const res = await api<{ collection: { urn: string }[]; has_more: boolean }>(
        `/me/followings?limit=200&page=${page}`,
        {},
        undefined,
        { silent: true },
      );
      if (res.collection.some((u) => urnIdsMatch(u.urn, targetUrn))) return true;
      if (!res.has_more) break;
    } catch {
      break;
    }
  }
  return false;
}
