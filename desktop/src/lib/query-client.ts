import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) {
    const status = error.status;
    if (status >= 500 || status === 429 || status === 405 || status === 404) return false;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 3,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
  },
});
