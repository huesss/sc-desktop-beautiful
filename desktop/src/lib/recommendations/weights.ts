export const TASTE_WEIGHTS = {
  like: 1.0,
  full_play: 0.55,
  skip_early: -0.85,
  skip_mid: -0.35,
  skip_late: -0.12,
} as const;

const EARLY_SKIP_PCT = 0.25;
const MID_SKIP_PCT = 0.6;

export function skipWeight(positionPct: number): number {
  const p = Math.max(0, Math.min(1, positionPct));
  if (p < EARLY_SKIP_PCT) return TASTE_WEIGHTS.skip_early;
  if (p < MID_SKIP_PCT) return TASTE_WEIGHTS.skip_mid;
  return TASTE_WEIGHTS.skip_late;
}

export function signalWeight(kind: 'like' | 'full_play' | 'skip', positionPct?: number): number {
  if (kind === 'like') return TASTE_WEIGHTS.like;
  if (kind === 'full_play') return TASTE_WEIGHTS.full_play;
  return skipWeight(positionPct ?? 0);
}
