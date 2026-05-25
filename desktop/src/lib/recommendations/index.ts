export type {
  AudioFeatures,
  RecommendHit,
  RecommendRequest,
  RecommendResponse,
  TasteSignal,
  TasteSignalKind,
  TrackMetadata,
  UserTasteProfile,
} from './types';
export { EMBEDDING_DIM, FEATURE_KEYS } from './types';

export {
  addScaled,
  buildEmbedding,
  cosineSimilarity,
  dot,
  featuresToVector,
  l2Normalize,
  l2Norm,
  mergeFeatureProfiles,
  weightedAverage,
} from './vector';

export { signalWeight, skipWeight, TASTE_WEIGHTS } from './weights';

export { AudioFeaturesService, audioFeaturesService } from './audio-features';

export {
  TasteProfileBuilder,
  buildProfileFromCatalog,
} from './taste-profile';

export {
  fetchDiscoverWeekly,
  mockDiscoverWeeklyHandler,
  mockRecommendFromCatalog,
  rankByCosineSimilarity,
} from './recommendation-api';

export { tasteMetaFromTrack, useTasteStore } from './taste-store';
