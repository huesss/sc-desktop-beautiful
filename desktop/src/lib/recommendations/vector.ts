import type { AudioFeatures } from './types';
import { EMBEDDING_DIM, FEATURE_KEYS } from './types';

export function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i]! * b[i]!;
  return sum;
}

export function l2Norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

export function l2Normalize(v: number[]): number[] {
  const norm = l2Norm(v);
  if (norm === 0) return v.map(() => 0);
  return v.map((x) => x / norm);
}

export function addScaled(target: number[], source: number[], scale: number): void {
  const n = Math.min(target.length, source.length);
  for (let i = 0; i < n; i++) target[i]! += source[i]! * scale;
}

export function weightedAverage(vectors: number[][], weights: number[]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]!.length;
  const acc = new Array<number>(dim).fill(0);
  let wSum = 0;

  for (let i = 0; i < vectors.length; i++) {
    const w = weights[i]!;
    if (w === 0) continue;
    addScaled(acc, vectors[i]!, w);
    wSum += w;
  }

  if (wSum === 0) return acc;
  return acc.map((x) => x / wSum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const na = l2Norm(a);
  const nb = l2Norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export function featuresToVector(features: AudioFeatures): number[] {
  return [
    features.bpm / 200,
    features.danceability,
    features.energy,
    features.valence,
    features.acousticness,
    features.instrumentalness,
  ];
}

export function buildEmbedding(features: AudioFeatures, seed: string): number[] {
  const base = featuresToVector(features);
  const out = new Array<number>(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const src = base[i % base.length]!;
    const jitter = hash01(seed, i) * 0.08 - 0.04;
    out[i] = Math.max(0, Math.min(1, src + jitter));
  }
  return l2Normalize(out);
}

function hash01(seed: string, slot: number): number {
  let h = slot;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 10000) / 10000;
}

export function mergeFeatureProfiles(
  profiles: AudioFeatures[],
  weights: number[],
): AudioFeatures | null {
  if (profiles.length === 0) return null;
  const acc: Record<keyof AudioFeatures, number> = {
    bpm: 0,
    danceability: 0,
    energy: 0,
    valence: 0,
    acousticness: 0,
    instrumentalness: 0,
  };
  let wSum = 0;

  for (let i = 0; i < profiles.length; i++) {
    const w = weights[i]!;
    if (w === 0) continue;
    for (const key of FEATURE_KEYS) acc[key] += profiles[i]![key] * w;
    wSum += w;
  }

  if (wSum === 0) return null;
  const out = {} as AudioFeatures;
  for (const key of FEATURE_KEYS) out[key] = acc[key] / wSum;
  return out;
}
