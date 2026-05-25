import { fetch } from '@tauri-apps/plugin-http';
import { toast } from 'sonner';
import { useAppStatusStore } from '../stores/app-status';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { noteAuthGap, noteRateLimit, noteSuccess } from './auth-recovery';
import { API_BASE, BYPASS_API_BASE } from './constants';
import { logHttpError, logHttpFailure, trackAsync } from './diagnostics';
import { isHealthy, markHealthy, markUnhealthy } from './host-health';
import { getIsPremium } from './premium-cache';
import {
  isMalformedSessionBody,
  isValidSessionId,
  normalizeSessionId,
} from './session-id';
import { useAuthRecoveryStore } from '../stores/auth-recovery';



let sessionId: string | null = null;

export function setSessionId(id: string | null) {
  sessionId = id ? normalizeSessionId(id) : null;
}

export function getApiBases(path: string): string[] {
  return resolveApiBases(path);
}

function clearBrokenSession(): void {
  useAuthStore.getState().logout();
  useAuthRecoveryStore.getState().reset();
}

export function getSessionId() {
  return sessionId;
}



export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

function isRateLimitError(status: number, body: string): boolean {
  if (status === 429) return true;
  const b = body.toLowerCase();
  return b.includes('rate limit') || b.includes('rate-limited') || b.includes('too many requests');
}



const AUTH_PATHS = ['/auth/', '/me/subscription'];

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path.startsWith(p));
}

function resolveApiBases(path: string): string[] {
  
  if (isAuthPath(path)) {
    return isHealthy(BYPASS_API_BASE) ? [BYPASS_API_BASE, API_BASE] : [API_BASE, BYPASS_API_BASE];
  }

  const bypass = useSettingsStore.getState().bypassWhitelist;
  const premium = getIsPremium();

  
  if (bypass && premium) {
    return isHealthy(BYPASS_API_BASE) ? [BYPASS_API_BASE, API_BASE] : [API_BASE];
  }

  
  return [API_BASE];
}



function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 60_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  ) as Promise<Response>;
}

function handleApiError(err: ApiError, opts?: { silent?: boolean }): void {
  if (opts?.silent) return;
  if (err.status >= 500) {
    toast.error(`Server error (${err.status})`);
  } else if (err.status >= 400 && err.status !== 401) {
    try {
      const parsed = JSON.parse(err.body);
      toast.error(parsed.message || parsed.error || `Error ${err.status}`);
    } catch {
      toast.error(`Error ${err.status}`);
    }
  }
}



export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  timeoutMs?: number,
  opts?: { silent?: boolean },
): Promise<T> {
  const headers = new Headers(options.headers);
  
  if (sessionId) {
    headers.set('x-session-id', sessionId);
  }
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');

  const bases = resolveApiBases(path);
  const method = options.method ?? 'GET';
  let lastError: unknown = null;

  const label = `${method.toUpperCase()} ${path}`;

  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    const url = `${base}${path}`;
    const attemptStart = performance.now();
    try {
      const runFetch = () => fetchWithTimeout(url, { ...options, headers }, timeoutMs);
      const res = opts?.silent
        ? await runFetch()
        : await trackAsync(`http:${label}`, runFetch());

      markHealthy(base);
      useAppStatusStore.getState().setBackendReachable(true);

      if (!res.ok) {
        const body = await res.text();
        const err = new ApiError(res.status, body);
        if (!opts?.silent) {
          logHttpError(label, res.status, url, body);
        }

        if (res.status >= 500 && i < bases.length - 1) {
          markUnhealthy(base);
          lastError = err;
          continue;
        }

        if (isRateLimitError(res.status, body)) {
          noteRateLimit();
          if (!opts?.silent) console.error(`HTTP ERROR: url: ${path}, `, err);
          throw err;
        }

        if (
          res.status === 401 &&
          (isMalformedSessionBody(res.status, body) || (sessionId && !isValidSessionId(sessionId)))
        ) {
          clearBrokenSession();
          throw err;
        }

        const isRefresh = path === '/auth/refresh';
        if (!isRefresh && (res.status === 401 || useAuthStore.getState().user == null)) {
          noteAuthGap();
          if (!opts?.silent) console.error(`HTTP ERROR: url: ${path}, `, err);
          throw err;
        }

        if (isRefresh && res.status === 401) {
          throw err;
        }

        if (!opts?.silent) {
          handleApiError(err, opts);
          console.error(`HTTP ERROR: url: ${path}, `, err);
        }
        throw err;
      }

      
      
      noteSuccess();

      const ct = res.headers.get('content-type');
      const reply = await (ct?.includes('application/json') ? res.json() : (res.text() as T));

      if (typeof reply === 'string') {
        try {
          return JSON.parse(reply) as T;
        } catch {}
      }

      return reply;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (!opts?.silent) {
        logHttpFailure(label, url, error, performance.now() - attemptStart);
      }
      markUnhealthy(base);
      lastError = error;
    }
  }

  useAppStatusStore.getState().setBackendReachable(false);
  throw lastError ?? new Error('All API hosts unreachable');
}



export const fetchWithAuthFallback = apiRequest;
