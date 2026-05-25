import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CallStatus, callIsEnabled, callSetEnabled, callStatus } from '../../lib/call';
import { Lock } from '../../lib/icons';
import { StarModal, useStarSubscription } from '../layout/StarSubscription';
import {
  SettingsGroup,
  SettingsRow,
  SettingsRowInner,
  SettingsToggle,
} from './settings-ui';

const STATUS_POLL_MS = 5000;

const DOT_COLOR: Record<CallStatus['kind'], string> = {
  active: '#34d399',
  connecting: '#fbbf24',
  provisioning: '#fbbf24',
  failed: '#ef4444',
  disabled: '#52525b',
};

export const CallProxySection: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { isPremium, modalOpen, setModalOpen, openModal } = useStarSubscription();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState<CallStatus>({ kind: 'disabled' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    callIsEnabled()
      .then((v) => {
        setEnabled(v);
        callStatus()
          .then(setStatus)
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      callStatus()
        .then(setStatus)
        .catch(() => {});
    }, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [enabled]);

  const onToggle = async () => {
    if (busy || enabled === null) return;
    if (enabled && !isPremium) {
      openModal();
      return;
    }
    setBusy(true);
    try {
      const next = !enabled;
      const s = await callSetEnabled(next);
      setEnabled(next);
      setStatus(s);
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) return null;

  const dot = DOT_COLOR[status.kind];
  const locked = enabled && !isPremium;
  const statusLine = t(`call.status.${status.kind}`);

  return (
    <>
      <SettingsGroup title={t('call.title')}>
        <SettingsRow divider={false}>
          <SettingsRowInner
            leading={
              <div
                className="size-2.5 rounded-full"
                style={{
                  background: dot,
                  boxShadow: status.kind === 'active' ? `0 0 10px ${dot}` : undefined,
                }}
              />
            }
            label={t('call.title')}
            description={
              status.kind === 'failed' && status.error
                ? status.error
                : statusLine
            }
            trailing={
              <div className="relative">
                <SettingsToggle checked={enabled} onChange={onToggle} disabled={busy} />
                {locked ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#0a0a0a]">
                    <Lock size={9} className="text-white/50" />
                  </span>
                ) : null}
              </div>
            }
          />
        </SettingsRow>
      </SettingsGroup>
      <StarModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
});

CallProxySection.displayName = 'CallProxySection';
