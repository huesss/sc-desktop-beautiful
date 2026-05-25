import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tauriStorage } from './tauri-storage';

const MIN_RESUME_SEC = 3;
const END_MARGIN_SEC = 8;

interface PlaybackResumeState {
  urn: string | null;
  position: number;
  setResume: (urn: string, position: number) => void;
  clear: () => void;
}

export const usePlaybackResumeStore = create<PlaybackResumeState>()(
  persist(
    (set) => ({
      urn: null,
      position: 0,
      setResume: (urn, position) => set({ urn, position: Math.max(0, position) }),
      clear: () => set({ urn: null, position: 0 }),
    }),
    {
      name: 'sc-playback-resume',
      storage: createJSONStorage(() => tauriStorage),
    },
  ),
);

export function getResumePosition(urn: string, durationSecs: number): number {
  const { urn: savedUrn, position } = usePlaybackResumeStore.getState();
  if (savedUrn !== urn || position < MIN_RESUME_SEC) return 0;
  if (durationSecs > 0 && position >= durationSecs - END_MARGIN_SEC) return 0;
  return position;
}

export function savePlaybackResume(urn: string, position: number) {
  if (position < 1) return;
  usePlaybackResumeStore.getState().setResume(urn, position);
}

export function clearPlaybackResume() {
  usePlaybackResumeStore.getState().clear();
}
