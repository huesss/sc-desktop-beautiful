import * as Dialog from '@radix-ui/react-dialog';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { completeReauth, retryRenew } from '../lib/auth-recovery';
import { Check, ClipboardCopy, Lock, Power, RefreshCw, X } from '../lib/icons';
import { useOAuthFlow } from '../lib/use-oauth-flow';
import { useAuthStore } from '../stores/auth';
import { useAuthRecoveryStore } from '../stores/auth-recovery';

export const SessionRecoveryModal = React.memo(() => {
  const { t } = useTranslation();
  const phase = useAuthRecoveryStore((s) => s.phase);
  const busy = useAuthRecoveryStore((s) => s.busy);
  const reset = useAuthRecoveryStore((s) => s.reset);
  const setOauthActive = useAuthRecoveryStore((s) => s.setOauthActive);
  const logout = useAuthStore((s) => s.logout);
  const [copied, setCopied] = useState(false);

  const { startLogin, authUrl, isPolling, step } = useOAuthFlow(completeReauth);

  useEffect(() => {
    setOauthActive(isPolling);
    return () => setOauthActive(false);
  }, [isPolling, setOauthActive]);

  const open = phase === 'modal';
  const locked = busy || isPolling;

  const stepLabel =
    step === 'token'
      ? t('auth.stepToken')
      : step === 'profile'
        ? t('auth.stepProfile')
        : step === 'session'
          ? t('auth.stepSession')
          : t('recovery.signingIn');

  const handleSignIn = async () => {
    try {
      await startLogin();
    } catch (e) {
      console.error('Re-auth failed:', e);
    }
  };

  const handleLogout = () => {
    reset();
    logout();
  };

  let bodyState: 'oauth' | 'renewing' | 'actions';
  if (isPolling) bodyState = 'oauth';
  else if (busy) bodyState = 'renewing';
  else bodyState = 'actions';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !locked && reset()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-dialog-overlay fixed inset-0 z-[100]" />
        <Dialog.Content className="ui-dialog fixed left-1/2 top-1/2 z-[101] w-[360px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 outline-none">
          <div className="relative px-5 py-4">
            <Dialog.Close
              disabled={locked}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414] text-[#ffffff99] hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            >
              <X size={14} />
            </Dialog.Close>

            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-2 flex size-11 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
                <Lock size={20} className="text-[#ffffff99]" />
              </div>
              <Dialog.Title className="text-[15px] font-semibold tracking-tight text-white">
                {t('recovery.title')}
              </Dialog.Title>
              <p className="mt-1 max-w-[280px] text-[13px] leading-snug text-[#ffffff99]">
                {t('recovery.description')}
              </p>
            </div>

            <div className="space-y-2">
              {bodyState === 'oauth' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="ui-spinner size-7" />
                  <p className="text-[13px] text-[#ffffff99]">{stepLabel}</p>
                  {authUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(authUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn-secondary h-8 px-3 text-[12px]"
                    >
                      {copied ? (
                        <>
                          <Check size={11} />
                          {t('recovery.copied')}
                        </>
                      ) : (
                        <>
                          <ClipboardCopy size={11} />
                          {t('recovery.copyLink')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {bodyState === 'renewing' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="ui-spinner size-7" />
                  <p className="text-[13px] text-[#ffffff99]">{t('recovery.renewing')}</p>
                </div>
              )}

              {bodyState === 'actions' && (
                <>
                  <button type="button" onClick={() => void retryRenew()} className="btn-primary w-full">
                    <RefreshCw size={14} />
                    {t('recovery.retry')}
                  </button>
                  <button type="button" onClick={handleSignIn} className="btn-secondary w-full">
                    {t('recovery.signIn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[12px] text-[#ffffff99] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  >
                    <Power size={12} />
                    {t('recovery.logout')}
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
