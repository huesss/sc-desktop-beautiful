export interface AudioFeatures {
  bpm: number;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

export interface TrackMetadata {
  urn: string;
  title: string;
  artistName: string;
  features: AudioFeatures;
  embedding: number[];
}

export interface UserTasteProfile {
  vector: number[];
  dimension: number;
  totalWeight: number;
  updatedAt: number;
}

export type TasteSignalKind = 'like' | 'full_play' | 'skip';

export interface TasteSignal {
  urn: string;
  kind: TasteSignalKind;
  weight: number;
  features: AudioFeatures;
  embedding: number[];
  positionPct?: number;
  at: number;
}

export interface RecommendRequest {
  profileVector: number[];
  limit?: number;
  excludeUrns?: string[];
}

export interface RecommendHit {
  urn: string;
  title: string;
  artistName: string;
  score: number;
  features: AudioFeatures;
}

export interface RecommendResponse {
  tracks: RecommendHit[];
  generatedAt: number;
}

export const EMBEDDING_DIM = 8;

export const FEATURE_KEYS: (keyof AudioFeatures)[] = [
  'bpm',
  'danceability',
  'energy',
  'valence',
  'acousticness',
  'instrumentalness',
];
