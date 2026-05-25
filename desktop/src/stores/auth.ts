import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fetchWithAuthFallback, setSessionId } from '../lib/api';
import { isValidSessionId, normalizeSessionId } from '../lib/session-id';
import { tauriStorage } from '../lib/tauri-storage';

interface User {
  id: number;
  urn: string;
  username: string;
  avatar_url: string;
  permalink_url: string;
  followers_count: number;
  followings_count: number;
  track_count: number;
  playlist_count: number;
  public_favorites_count: number;
}

interface AuthState {
  sessionId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (sessionId: string) => boolean;
  fetchUser: () => Promise<void>;
  renewSession: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      user: null,
      isAuthenticated: false,

      setSession: (sessionId: string) => {
        const normalized = normalizeSessionId(sessionId);
        if (!normalized) return false;
        setSessionId(normalized);
        set({ sessionId: normalized, isAuthenticated: true });
        return true;
      },

      fetchUser: async () => {
        const { sessionId } = get();
        if (!sessionId) return;
        setSessionId(sessionId);
        const user = await fetchWithAuthFallback<User>('/me');
        set({ user, isAuthenticated: true });
      },

      renewSession: async () => {
        const { sessionId } = get();
        if (!isValidSessionId(sessionId)) {
          get().logout();
          throw new Error('Invalid session');
        }
        await fetchWithAuthFallback(
          '/auth/refresh',
          { method: 'POST' },
          undefined,
          { silent: true },
        );
        await get().fetchUser();
      },

      logout: () => {
        setSessionId(null);
        set({ sessionId: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sc-auth',
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({ sessionId: state.sessionId }),
      onRehydrateStorage: () => (state) => {
        if (!state?.sessionId) return;
        if (!isValidSessionId(state.sessionId)) {
          setSessionId(null);
          state.sessionId = null;
          state.isAuthenticated = false;
          state.user = null;
          return;
        }
        setSessionId(state.sessionId);
      },
    },
  ),
);
