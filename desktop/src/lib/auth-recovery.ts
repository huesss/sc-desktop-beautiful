import { useAuthStore } from '../stores/auth';
import { useAuthRecoveryStore } from '../stores/auth-recovery';
import { queryClient } from './query-client';
import { isValidSessionId } from './session-id';
















const RL_WINDOW_MS = 15_000;
const RL_THRESHOLD = 3;
const RECOVERED_COOLDOWN_MS = 5000;

let rlHits: number[] = [];
let inFlight: Promise<void> | null = null;

let gen = 0;
let cancelledGen = -1;

async function runRenew(manual: boolean): Promise<void> {
  if (inFlight) return inFlight;

  const myGen = ++gen;
  const store = useAuthRecoveryStore.getState();
  if (manual) {
    store.setBusy(true);
  } else {
    store.setPhase('silent');
  }

  inFlight = (async () => {
    try {
      await useAuthStore.getState().renewSession();
      useAuthRecoveryStore.getState().markRecovered();
      queryClient.invalidateQueries();
    } catch {
      
      if (cancelledGen === myGen) return;
      const s = useAuthRecoveryStore.getState();
      s.setPhase('modal');
      s.setBusy(false);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function startRecovery(): void {
  const sessionId = useAuthStore.getState().sessionId;
  if (!isValidSessionId(sessionId)) {
    useAuthStore.getState().logout();
    useAuthRecoveryStore.getState().reset();
    return;
  }
  const s = useAuthRecoveryStore.getState();
  if (s.phase !== 'idle') return;
  if (Date.now() - s.recoveredAt < RECOVERED_COOLDOWN_MS) return;
  void runRenew(false);
}


export function noteRateLimit(): void {
  const now = Date.now();
  rlHits.push(now);
  rlHits = rlHits.filter((t) => now - t < RL_WINDOW_MS);
  if (rlHits.length >= RL_THRESHOLD) {
    rlHits = [];
    startRecovery();
  }
}


export function noteAuthGap(): void {
  startRecovery();
}






export function noteSuccess(): void {
  if (rlHits.length) rlHits = [];
  const s = useAuthRecoveryStore.getState();
  if (s.phase === 'idle' || s.busy || s.oauthActive) return;
  cancelledGen = gen;
  s.markRecovered();
}


export function retryRenew(): Promise<void> {
  return runRenew(true);
}


export function completeReauth(sessionId: string): void {
  const auth = useAuthStore.getState();
  if (!auth.setSession(sessionId)) return;
  auth.fetchUser().catch(() => {
    useAuthStore.setState({ isAuthenticated: true });
  });
  useAuthRecoveryStore.getState().markRecovered();
  queryClient.invalidateQueries();
}
