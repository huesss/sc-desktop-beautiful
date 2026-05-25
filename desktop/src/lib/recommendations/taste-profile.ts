import { signalWeight } from './weights';
import type { TasteSignal, TrackMetadata, UserTasteProfile } from './types';
import { EMBEDDING_DIM } from './types';
import { l2Normalize, mergeFeatureProfiles, weightedAverage } from './vector';

export class TasteProfileBuilder {
  private signals: TasteSignal[] = [];

  recordLike(meta: TrackMetadata): void {
    this.push(meta, 'like');
  }

  recordFullPlay(meta: TrackMetadata, positionPct = 1): void {
    this.push(meta, 'full_play', positionPct);
  }

  recordSkip(meta: TrackMetadata, positionPct: number): void {
    this.push(meta, 'skip', positionPct);
  }

  private push(meta: TrackMetadata, kind: TasteSignal['kind'], positionPct?: number): void {
    const weight = signalWeight(kind, positionPct);
    this.signals.push({
      urn: meta.urn,
      kind,
      weight,
      features: meta.features,
      embedding: meta.embedding,
      positionPct,
      at: Date.now(),
    });
  }

  getSignals(): readonly TasteSignal[] {
    return this.signals;
  }

  clear(): void {
    this.signals = [];
  }

  build(): UserTasteProfile | null {
    if (this.signals.length === 0) return null;

    const embeddings = this.signals.map((s) => s.embedding);
    const weights = this.signals.map((s) => s.weight);
    const raw = weightedAverage(embeddings, weights);
    const vector = l2Normalize(
      raw.length === EMBEDDING_DIM ? raw : [...raw, ...new Array(EMBEDDING_DIM - raw.length).fill(0)],
    );

    const totalWeight = weights.reduce((a, w) => a + Math.abs(w), 0);

    return {
      vector,
      dimension: vector.length,
      totalWeight,
      updatedAt: Date.now(),
    };
  }

  aggregateFeatures(): ReturnType<typeof mergeFeatureProfiles> {
    return mergeFeatureProfiles(
      this.signals.map((s) => s.features),
      this.signals.map((s) => s.weight),
    );
  }
}

export function buildProfileFromCatalog(
  liked: TrackMetadata[],
  skipped: { meta: TrackMetadata; positionPct: number }[],
): UserTasteProfile | null {
  const builder = new TasteProfileBuilder();
  for (const t of liked) builder.recordLike(t);
  for (const { meta, positionPct } of skipped) builder.recordSkip(meta, positionPct);
  return builder.build();
}
