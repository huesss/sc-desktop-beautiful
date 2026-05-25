import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { LOCAL_PREMIUM_UNLOCK } from '../../lib/constants';
import { type Aura, auraFromHex, DEFAULT_AURA, DEFAULT_CUSTOM_HEX, resolveAura } from '../../lib/aura';

type AuraResponse = {
  aura_id: string | null;
  custom_hex: string | null;
};

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 10 * 60 * 1000;
const LOCAL_AURA_KEY = 'scd-local-aura';

const auraKey = (urn: string | undefined) => ['user', urn, 'aura'] as const;

function readLocalAura(): AuraResponse | null {
  try {
    const raw = localStorage.getItem(LOCAL_AURA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuraResponse;
  } catch {
    return null;
  }
}

function writeLocalAura(payload: { aura_id: string; custom_hex?: string | null }) {
  const data: AuraResponse = {
    aura_id: payload.aura_id,
    custom_hex: payload.custom_hex ?? null,
  };
  localStorage.setItem(LOCAL_AURA_KEY, JSON.stringify(data));
  return data;
}

export function useUserAura(urn: string | undefined, hasStar: boolean) {
  const query = useQuery({
    queryKey: auraKey(urn),
    queryFn: () =>
      LOCAL_PREMIUM_UNLOCK
        ? Promise.resolve(readLocalAura() ?? { aura_id: null, custom_hex: null })
        : api<AuraResponse>(`/users/${encodeURIComponent(urn!)}/aura`),
    enabled: !!urn && hasStar,
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

  const aura = useMemo(
    () => (hasStar ? resolveAura(query.data?.aura_id, query.data?.custom_hex) : DEFAULT_AURA),
    [hasStar, query.data?.aura_id, query.data?.custom_hex],
  );

  const initialCustomHex = query.data?.custom_hex ?? DEFAULT_CUSTOM_HEX;
  return { aura, customHex: initialCustomHex, isLoading: query.isLoading };
}

const SAVE_DEBOUNCE_MS = 500;

export function useEditableUserAura(urn: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const remote = useQuery({
    queryKey: auraKey(urn),
    queryFn: () =>
      LOCAL_PREMIUM_UNLOCK
        ? Promise.resolve(readLocalAura() ?? { aura_id: null, custom_hex: null })
        : api<AuraResponse>(`/users/${encodeURIComponent(urn!)}/aura`),
    enabled: !!urn && enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

  const [aura, setAura] = useState<Aura>(DEFAULT_AURA);
  const [customHex, setCustomHex] = useState<string>(DEFAULT_CUSTOM_HEX);
  const initRef = useRef(false);

  useEffect(() => {
    if (!enabled || initRef.current) return;
    const data = remote.data ?? (LOCAL_PREMIUM_UNLOCK ? readLocalAura() : null);
    if (!data) return;
    setAura(resolveAura(data.aura_id, data.custom_hex));
    if (data.custom_hex) setCustomHex(data.custom_hex);
    initRef.current = true;
  }, [enabled, remote.data]);

  const mutation = useMutation({
    mutationFn: (payload: { aura_id: string; custom_hex?: string | null }) => {
      if (LOCAL_PREMIUM_UNLOCK) {
        return Promise.resolve(writeLocalAura(payload));
      }
      return api<AuraResponse>('/me/aura', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      if (urn) qc.setQueryData(auraKey(urn), data);
    },
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = useCallback(
    (next: Aura, hex: string) => {
      if (!enabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutation.mutate({
          aura_id: next.id,
          custom_hex: next.id === 'custom' ? hex : null,
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [enabled, mutation],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onPickAura = useCallback(
    (next: Aura) => {
      setAura(next);
      queueSave(next, customHex);
    },
    [customHex, queueSave],
  );

  const onPickCustom = useCallback(
    (hex: string) => {
      setCustomHex(hex);
      const next = auraFromHex(hex);
      if (next) {
        setAura(next);
        queueSave(next, hex);
      }
    },
    [queueSave],
  );

  return { aura, customHex, onPickAura, onPickCustom };
}
