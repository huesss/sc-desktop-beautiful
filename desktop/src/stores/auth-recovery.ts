import { create } from 'zustand';















export type RecoveryPhase = 'idle' | 'silent' | 'modal';

interface AuthRecoveryState {
  phase: RecoveryPhase;
  busy: boolean;
  
  oauthActive: boolean;
  
  recoveredAt: number;
  setPhase: (phase: RecoveryPhase) => void;
  setBusy: (busy: boolean) => void;
  setOauthActive: (oauthActive: boolean) => void;
  
  markRecovered: () => void;
  
  reset: () => void;
}

export const useAuthRecoveryStore = create<AuthRecoveryState>((set) => ({
  phase: 'idle',
  busy: false,
  oauthActive: false,
  recoveredAt: 0,
  setPhase: (phase) => set({ phase }),
  setBusy: (busy) => set({ busy }),
  setOauthActive: (oauthActive) => set({ oauthActive }),
  markRecovered: () => set({ phase: 'idle', busy: false, recoveredAt: Date.now() }),
  reset: () => set({ phase: 'idle', busy: false }),
}));
