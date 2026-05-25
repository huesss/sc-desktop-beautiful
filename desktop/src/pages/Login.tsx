import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { QrLinkSheet } from '../components/auth/QrLinkSheet';
import {
  AlertCircle,
  Check,
  ChevronRight,
  ClipboardCopy,
  Disc3,
  Download,
  Globe,
  RefreshCw,
  Smartphone,
} from '../lib/icons';
import { queryClient } from '../lib/query-client';
import { useOAuthFlow } from '../lib/use-oauth-flow';
import { toast } from 'sonner';
import { useAppStatusStore } from '../stores/app-status';
import { useAuthStore } from '../stores/auth';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const setOfflineBypass = useAppStatusStore((s) => s.setOfflineBypass);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleEnterOffline = () => {
    setOfflineBypass(true);
    navigate('/offline', { replace: true });
  };

  const onLoginSuccess = async (sessionId: string) => {
    if (!setSession(sessionId)) {
      toast.error(t('auth.errorFailedTitle'));
      return;
    }
    try {
      await fetchUser();
    } catch {
      useAuthStore.setState({ isAuthenticated: true });
    }
    queryClient.invalidateQueries();
  };

  const { startLogin, authUrl, isPolling, step, error } = useOAuthFlow(onLoginSuccess);

  const handleLogin = async () => {
    try {
      await startLogin();
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const errorTitle = !error
    ? ''
    : error.kind === 'unreachable'
      ? t('auth.errorServerTitle')
      : error.kind === 'expired'
        ? t('auth.errorExpiredTitle')
        : t('auth.errorFailedTitle');
  const errorDesc =
    error?.kind === 'unreachable' ? t('auth.errorServerDesc') : (error?.message ?? '');

  const stepLabel =
    step === 'token'
      ? t('auth.stepToken')
      : step === 'profile'
        ? t('auth.stepProfile')
        : step === 'session'
          ? t('auth.stepSession')
          : t('auth.stepWaiting');

  return (
    <div className="font-inter flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 px-6">
        <div className="flex size-16 items-center justify-center rounded-lg border border-white/10 bg-[#141414]">
          <Disc3 size={28} className="text-accent" strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h1 className="text-[15px] font-medium tracking-tight text-white">
            SoundCloud Desktop
          </h1>
          <p className="mt-1.5 text-[13px] text-[#ffffff99]">
            {isPolling ? t('auth.signingIn') : t('auth.tagline')}
          </p>
        </div>

        {error ? (
          <div className="flex w-full flex-col items-stretch gap-3">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-[#141414] px-5 py-5 text-center">
              <div className="flex size-10 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                <AlertCircle size={18} className="text-red-400/90" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{errorTitle}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#ffffff99] break-words">
                  {errorDesc}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogin}
              className="btn-primary w-full"
            >
              <RefreshCw size={15} strokeWidth={2} />
              {t('auth.retry')}
            </button>
            <OfflineEntryCard onClick={handleEnterOffline} />
          </div>
        ) : isPolling ? (
          <div className="flex flex-col items-center gap-2">
            <div className="ui-spinner size-8" />
            <p className="text-[13px] text-[#ffffff99]">{stepLabel}</p>
            {authUrl && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(authUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-[#141414] px-3 text-[13px] text-[#ffffff99] transition-colors hover:border-white/20 hover:bg-white/5 hover:text-[#ffffff99] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    {t('auth.copied')}
                  </>
                ) : (
                  <>
                    <ClipboardCopy size={12} />
                    {t('auth.copyLink')}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-stretch gap-3">
            <button
              type="button"
              onClick={handleLogin}
              className="btn-primary w-full"
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="btn-secondary w-full"
            >
              <Smartphone size={14} strokeWidth={1.75} />
              {t('qrLink.scanQr')}
            </button>

            <div className="my-0.5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#ffffff99]">
                {t('auth.orSeparator')}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <OfflineEntryCard onClick={handleEnterOffline} />
          </div>
        )}
      </div>
      <QrLinkSheet open={qrOpen} onOpenChange={setQrOpen} mode="pull" onSuccess={onLoginSuccess} />
    </div>
  );
}

function OfflineEntryCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[.03] p-4 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 cursor-pointer"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
          <Globe size={16} className="text-[#ffffff99]" strokeWidth={1.75} />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border border-white/10 bg-[#141414]">
            <Download size={8} strokeWidth={2.5} className="text-[#ffffff99]" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {t('auth.continueOffline')}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[#ffffff99]">
            {t('auth.continueOfflineDesc')}
          </span>
        </span>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-[#ffffff99] transition-colors group-hover:text-[#ffffff99]"
      />
    </button>
  );
}
