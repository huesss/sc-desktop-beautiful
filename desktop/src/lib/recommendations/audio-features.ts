import { api } from '../api';
import type { AudioFeatures, TrackMetadata } from './types';
import { buildEmbedding } from './vector';

const featureCache = new Map<string, AudioFeatures>();

function mockFeaturesFromUrn(urn: string): AudioFeatures {
  let h = 0;
  for (let i = 0; i < urn.length; i++) h = (h * 31 + urn.charCodeAt(i)) | 0;
  const r = (n: number) => (((h + n) >>> 0) % 1000) / 1000;

  return {
    bpm: 70 + r(1) * 110,
    danceability: r(2),
    energy: r(3),
    valence: r(4),
    acousticness: r(5),
    instrumentalness: r(6) * 0.6,
  };
}

export class AudioFeaturesService {
  async fetchFeatures(urn: string): Promise<AudioFeatures> {
    const cached = featureCache.get(urn);
    if (cached) return cached;

    try {
      const remote = await api<AudioFeatures>(
        `/tracks/${encodeURIComponent(urn)}/audio-features`,
      );
      featureCache.set(urn, remote);
      return remote;
    } catch {
      const mock = mockFeaturesFromUrn(urn);
      featureCache.set(urn, mock);
      return mock;
    }
  }

  async fetchTrackMetadata(
    urn: string,
    title: string,
    artistName: string,
  ): Promise<TrackMetadata> {
    const features = await this.fetchFeatures(urn);
    return {
      urn,
      title,
      artistName,
      features,
      embedding: buildEmbedding(features, urn),
    };
  }

  clearCache(): void {
    featureCache.clear();
  }
}

export const audioFeaturesService = new AudioFeaturesService();
