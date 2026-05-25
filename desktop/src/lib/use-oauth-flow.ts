import { fetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithAuthFallback, getApiBases } from './api-client';

interface LoginResponse {
  url: string;
  loginRequestId: string;
}

interface LoginStatusResponse {
  status: 'pending' | 'completed' | 'failed' | 'expired';
  step?: 'token' | 'profile' | 'session';
  sessionId?: string;
  username?: string;
  error?: string;
  redirectUrl?: string;
}

export type OAuthStep = 'waiting' | 'token' | 'profile' | 'session';
export type OAuthFlowError = {
  kind: 'failed' | 'expired' | 'unreachable';
  message: string;
};

const POLL_INTERVAL_MS = 700;


const UNREACHABLE_AFTER_MS = 15_000;

export function useOAuthFlow(
  onSuccess: (sessionId: string) => void,
  onFailure?: (err: OAuthFlowError) => void,
) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [step, setStep] = useState<OAuthStep>('waiting');
  const [error, setError] = useState<OAuthFlowError | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;

  const cancel = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
    setAuthUrl(null);
    setStep('waiting');
  }, []);

  useEffect(() => cancel, [cancel]);

  const fail = useCallback(
    (err: OAuthFlowError) => {
      cancel();
      setError(err);
      onFailureRef.current?.(err);
    },
    [cancel],
  );

  const startLogin = useCallback(async () => {
    cancel();
    setError(null);
    setIsPolling(true);
    setStep('waiting');

    
    
    let login: LoginResponse;
    try {
      login = await fetchWithAuthFallback<LoginResponse>('/auth/login');
    } catch (e) {
      fail({
        kind: 'unreachable',
        message: e instanceof Error ? e.message : 'Backend unreachable',
      });
      return;
    }
    const { url, loginRequestId } = login;
    setAuthUrl(url);
    await openUrl(url);

    let failingSince: number | null = null;
    let lastRedirect: string | null = null;

    const tryPoll = async (
      base: string,
      requestId: string,
    ): Promise<LoginStatusResponse | null> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      try {
        const res = await fetch(
          `${base}/auth/login/status?id=${encodeURIComponent(requestId)}`,
          { signal: controller.signal, cache: 'no-store' as RequestCache },
        );
        if (!res.ok) return null;
        return (await res.json()) as LoginStatusResponse;
      } finally {
        clearTimeout(timer);
      }
    };

    const pollBases = getApiBases('/auth/login/status');

    const pollOnce = async () => {
      let sawResponse = false;
      let pending: LoginStatusResponse | null = null;

      for (const base of pollBases) {
        let data: LoginStatusResponse | null = null;
        try {
          data = await tryPoll(base, loginRequestId);
        } catch {
          continue;
        }
        if (!data) continue;
        sawResponse = true;

        if (data.redirectUrl && data.redirectUrl !== lastRedirect) {
          lastRedirect = data.redirectUrl;
          setStep('waiting');
          pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
          return;
        }

        if (data.step) setStep(data.step);

        if (data.status === 'completed' && data.sessionId) {
          cancel();
          onSuccessRef.current(String(data.sessionId));
          return;
        }
        if (data.status === 'failed' || data.status === 'expired') {
          fail({ kind: data.status, message: data.error ?? 'Login failed' });
          return;
        }
        pending = data;
      }

      if (!sawResponse) {
        const now = Date.now();
        if (failingSince == null) failingSince = now;
        if (now - failingSince >= UNREACHABLE_AFTER_MS) {
          fail({ kind: 'unreachable', message: 'Backend unreachable' });
          return;
        }
        pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        return;
      }
      failingSince = null;
      if (pending?.step) setStep(pending.step);
      pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
    };

    pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
  }, [cancel, fail]);

  return { startLogin, authUrl, isPolling, step, cancel, error };
}
