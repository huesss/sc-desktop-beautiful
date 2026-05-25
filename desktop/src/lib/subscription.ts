import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { LOCAL_PREMIUM_UNLOCK } from './constants';
import { useAuthStore } from '../stores/auth';
import { setIsPremium } from './premium-cache';

export { getIsPremium } from './premium-cache';

const QUERY_KEY = ['me', 'subscription'] as const;

if (LOCAL_PREMIUM_UNLOCK) {
  setIsPremium(true);
}

async function fetchSubscription(): Promise<{ premium: boolean }> {
  if (LOCAL_PREMIUM_UNLOCK) {
    setIsPremium(true);
    return { premium: true };
  }
  const data = await api<{ premium: boolean }>('/me/subscription');
  setIsPremium(data.premium);
  return data;
}

export function useSubscription(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSubscription,
    enabled,
    staleTime: LOCAL_PREMIUM_UNLOCK ? Infinity : 30_000,
    refetchInterval: LOCAL_PREMIUM_UNLOCK ? false : 30_000,
    select: (d) => d.premium,
    initialData: { premium: true },
    placeholderData: { premium: true },
  });
}

if (!LOCAL_PREMIUM_UNLOCK) {
  useAuthStore.subscribe((state, prev) => {
    if (state.isAuthenticated && !prev.isAuthenticated) {
      fetchSubscription().catch(() => {
        setIsPremium(false);
      });
    }
    if (!state.isAuthenticated && prev.isAuthenticated) {
      setIsPremium(false);
    }
  });

  if (useAuthStore.getState().isAuthenticated) {
    fetchSubscription().catch(() => {
      setIsPremium(false);
    });
  }
}
