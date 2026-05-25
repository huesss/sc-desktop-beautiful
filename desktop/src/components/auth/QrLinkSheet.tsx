import * as Dialog from '@radix-ui/react-dialog';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, Smartphone, X } from '../../lib/icons';
import { encodeQrPayload } from '../../lib/qr-link';
import { QrCode } from './QrCode';
import { useQrLink } from './useQrLink';

interface QrLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'pull' | 'push';
  onSuccess?: (sessionId: string) => void;
}

export const QrLinkSheet = React.memo(
  ({ open, onOpenChange, mode, onSuccess }: QrLinkSheetProps) => {
    const { t } = useTranslation();
    const { state, start, reset } = useQrLink(mode, onSuccess);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
      if (open) start();
      else reset();
    }, [open, start, reset]);

    useEffect(() => {
      if (state.status !== 'pending') return;
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, [state.status]);

    const remainingSec = state.expiresAt
      ? Math.max(0, Math.floor((state.expiresAt.getTime() - now) / 1000))
      : 0;

    const titleKey = mode === 'pull' ? 'qrLink.pullTitle' : 'qrLink.pushTitle';
    const subtitleKey = mode === 'pull' ? 'qrLink.pullSubtitle' : 'qrLink.pushSubtitle';

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="ui-dialog-overlay fixed inset-0 z-[100]" />
          <Dialog.Content className="ui-dialog fixed left-1/2 top-1/2 z-[101] w-[400px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 outline-none">
            <div className="relative px-5 py-4">
              <Dialog.Close className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#141414] text-[#ffffff99] hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                <X size={14} />
              </Dialog.Close>

              <div className="flex flex-col items-center text-center mb-4">
                <div className="mb-2 flex size-10 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
                  <Smartphone size={18} className="text-[#ffffff99]" />
                </div>
                <Dialog.Title className="text-[15px] font-semibold tracking-tight text-white">
                  {t(titleKey)}
                </Dialog.Title>
                <p className="mt-1 text-[13px] text-[#ffffff99] leading-snug max-w-[300px]">
                  {t(subtitleKey)}
                </p>
              </div>

              {(state.status === 'creating' || state.status === 'idle') && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="ui-spinner size-7" />
                  <p className="text-[13px] text-[#ffffff99]">{t('qrLink.preparing')}</p>
                </div>
              )}

              {state.status === 'pending' && state.claimToken && (
                <div className="flex flex-col items-center gap-3">
                  <QrCode payload={encodeQrPayload(state.claimToken, mode)} size={240} />
                  <p className="text-[13px] text-[#ffffff99]">
                    {t('qrLink.expiresIn', { seconds: remainingSec })}
                  </p>
                </div>
              )}

              {state.status === 'claimed' && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="flex size-11 items-center justify-center rounded-full border border-accent/30 bg-accent/15">
                    <Check size={20} className="text-accent" />
                  </div>
                  <p className="text-[13px] text-[#ffffff99]">
                    {mode === 'pull' ? t('qrLink.pullSuccess') : t('qrLink.pushSuccess')}
                  </p>
                </div>
              )}

              {(state.status === 'failed' || state.status === 'expired') && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-[13px] text-red-400/90 text-center max-w-[280px]">
                    {state.error || t('qrLink.failed')}
                  </p>
                  <button type="button" onClick={() => start()} className="btn-secondary">
                    <RefreshCw size={12} />
                    {t('qrLink.retry')}
                  </button>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);
QrLinkSheet.displayName = 'QrLinkSheet';
