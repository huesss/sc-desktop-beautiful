import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { audioFeaturesService } from './audio-features';
import { TasteProfileBuilder } from './taste-profile';
import type { TrackMetadata, UserTasteProfile } from './types';
import { tauriStorage } from '../tauri-storage';

interface TasteStoreState {
  profile: UserTasteProfile | null;
  builder: TasteProfileBuilder;
  hydrateAndLike: (urn: string, title: string, artistName: string) => Promise<void>;
  hydrateAndSkip: (
    urn: string,
    title: string,
    artistName: string,
    positionPct: number,
  ) => Promise<void>;
  rebuildProfile: () => void;
  resetTaste: () => void;
}

export const useTasteStore = create<TasteStoreState>()(
  persist(
    (set, get) => ({
      profile: null,
      builder: new TasteProfileBuilder(),

      hydrateAndLike: async (urn, title, artistName) => {
        const meta = await audioFeaturesService.fetchTrackMetadata(urn, title, artistName);
        get().builder.recordLike(meta);
        get().rebuildProfile();
      },

      hydrateAndSkip: async (urn, title, artistName, positionPct) => {
        const meta = await audioFeaturesService.fetchTrackMetadata(urn, title, artistName);
        get().builder.recordSkip(meta, positionPct);
        get().rebuildProfile();
      },

      rebuildProfile: () => {
        const profile = get().builder.build();
        set({ profile });
      },

      resetTaste: () => {
        get().builder.clear();
        set({ profile: null });
      },
    }),
    {
      name: 'sc-taste-profile',
      storage: createJSONStorage(() => tauriStorage),
      partialize: (s) => ({ profile: s.profile }),
      merge: (persisted, current) => {
        const p = persisted as Partial<TasteStoreState> | undefined;
        const builder = new TasteProfileBuilder();
        return { ...current, ...p, builder };
      },
    },
  ),
);

export function tasteMetaFromTrack(track: {
  urn: string;
  title: string;
  user: { username: string };
}): Pick<TrackMetadata, 'urn' | 'title' | 'artistName'> {
  return {
    urn: track.urn,
    title: track.title,
    artistName: track.user.username,
  };
}
