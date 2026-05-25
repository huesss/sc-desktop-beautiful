import { api } from '../api';
import type {
  RecommendHit,
  RecommendRequest,
  RecommendResponse,
  TrackMetadata,
  UserTasteProfile,
} from './types';
import { cosineSimilarity } from './vector';

export function rankByCosineSimilarity(
  profileVector: number[],
  catalog: TrackMetadata[],
  limit: number,
  excludeUrns: Set<string> = new Set(),
): RecommendHit[] {
  const scored = catalog
    .filter((t) => !excludeUrns.has(t.urn))
    .map((t) => ({
      urn: t.urn,
      title: t.title,
      artistName: t.artistName,
      score: cosineSimilarity(profileVector, t.embedding),
      features: t.features,
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export async function mockRecommendFromCatalog(
  profile: UserTasteProfile,
  catalog: TrackMetadata[],
  limit = 10,
  excludeUrns?: string[],
): Promise<RecommendResponse> {
  const tracks = rankByCosineSimilarity(
    profile.vector,
    catalog,
    limit,
    new Set(excludeUrns ?? []),
  );
  return { tracks, generatedAt: Date.now() };
}

export async function fetchDiscoverWeekly(
  req: RecommendRequest,
): Promise<RecommendResponse> {
  try {
    return await api<RecommendResponse>('/recommendations/discover-weekly', {
      method: 'POST',
      body: JSON.stringify({
        profileVector: req.profileVector,
        limit: req.limit ?? 10,
        excludeUrns: req.excludeUrns ?? [],
      }),
    });
  } catch {
    return {
      tracks: [],
      generatedAt: Date.now(),
    };
  }
}

export function mockDiscoverWeeklyHandler(
  profileVector: number[],
  catalog: TrackMetadata[],
  limit = 10,
  excludeUrns: string[] = [],
): RecommendResponse {
  const tracks = rankByCosineSimilarity(
    profileVector,
    catalog,
    limit,
    new Set(excludeUrns),
  );
  return { tracks, generatedAt: Date.now() };
}
