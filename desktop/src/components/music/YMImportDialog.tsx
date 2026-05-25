import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/shallow';
import { proxiedAssetUrl } from '../../lib/asset-url';
import { X } from '../../lib/icons';
import { isYmImportBusy, useYmImportStore } from '../../stores/ym-import';

function YMImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const {
    phase,
    saving,
    progress,
    playlist,
    playlistCount,
    startImport,
    stopImport,
    clearFinished,
  } = useYmImportStore(
    useShallow((state) => ({
      phase: state.phase,
      saving: state.saving,
      progress: state.progress,
      playlist: state.playlist,
      playlistCount: state.playlistCount,
      startImport: state.startImport,
      stopImport: state.stopImport,
      clearFinished: state.clearFinished,
    })),
  );

  const running = phase === 'running' || phase === 'stopping';
  const busy = isYmImportBusy({ phase, saving });

  useEffect(() => {
    if (!open && !busy) {
      setToken('');
      clearFinished();
    }
  }, [busy, clearFinished, open]);

  const handleStart = useCallback(async () => {
    await startImport(token);
  }, [startImport, token]);

  const handleStop = useCallback(() => {
    void stopImport();
  }, [stopImport]);

  const handleHide = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleGoToPlaylist = useCallback(() => {
    if (!playlist) return;
    onOpenChange(false);
    navigate(`/playlist/${encodeURIComponent(playlist.urn)}`);
  }, [playlist, navigate, onOpenChange]);

  const pct =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-[80] bg-black/60 " />
        <Dialog.Content className="dialog-content fixed z-[80] top-1/2 left-1/2 w-full max-w-[520px] bg-[#141414]/95 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
          {}
          <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
            <Dialog.Title className="text-[18px] font-bold text-white tracking-tight">
              {t('settings.importYandex')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ffffff99] hover:text-[#ffffff99] hover:bg-white/5 transition-all cursor-pointer">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {}
          <div className="px-5 py-5 space-y-5">
            {}
            {playlist ? (
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[.03] ">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
                <div className="relative p-5 flex items-center gap-2">
                  {}
                  <div className="w-16 h-16 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {playlist.artwork_url ? (
                      <img
                        src={proxiedAssetUrl(playlist.artwork_url) ?? ''}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-7 h-7 text-accent/60"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white truncate">{playlist.title}</p>
                    <p className="text-[12px] text-[#ffffff99] mt-0.5">
                      {progress?.found || 0} {t('search.tracks').toLowerCase()}
                      {playlistCount > 1
                        ? ` • ${playlistCount} ${t('search.playlists').toLowerCase()}`
                        : ''}
                    </p>
                    <p className="text-[11px] mt-1 text-green-400/80">
                      {busy ? t('ym.savingPlaylist') : t('ym.done')}
                    </p>
                  </div>
                  <button
                    onClick={handleGoToPlaylist}
                    className="px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 text-[13px] font-semibold text-accent border border-accent/10 transition-all cursor-pointer shrink-0"
                  >
                    {t('common.seeAll')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {}
                <div className="space-y-2 text-[13px] text-[#ffffff99]">
                  <p className="font-medium text-[#ffffff99]">{t('ym.instructions')}</p>
                  <ol className="list-decimal list-inside space-y-1 text-[12px]">
                    <li>{t('ym.step1')}</li>
                    <li>{t('ym.step2')}</li>
                    <li>{t('ym.step3')}</li>
                  </ol>
                </div>

                {}
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('ym.tokenPlaceholder')}
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 text-[13px] text-[#ffffff99] placeholder:text-white/20 focus:border-white/[0.12] focus:bg-white/[0.06] transition-all duration-200 outline-none disabled:opacity-50"
                />
              </>
            )}

            {}
            {progress && (busy || !playlist) && (
              <div className="space-y-3">
                {running && (
                  <div className="rounded-lg border border-accent/15 px-4 py-3 ">
                    <p className="text-[12px] font-medium text-white/78">
                      {t('ym.backgroundHint')}
                    </p>
                  </div>
                )}
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#ffffff99]">
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                  <span className="text-green-400">
                    {t('ym.found')}: {progress.found}
                  </span>
                  <span className="text-red-400">
                    {t('ym.notFound')}: {progress.not_found}
                  </span>
                </div>
                {progress.current_track && (
                  <p className="text-[12px] text-[#ffffff99] truncate">{progress.current_track}</p>
                )}
              </div>
            )}

            {saving && (
              <p className="text-[13px] text-[#ffffff99] animate-pulse">{t('ym.savingPlaylist')}</p>
            )}
          </div>

          {}
          {(running || !playlist) && (
            <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3">
              {running ? (
                <>
                  <button
                    onClick={handleHide}
                    className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-[13px] font-semibold text-white/72 border border-white/10 transition-all cursor-pointer"
                  >
                    {t('ym.hide')}
                  </button>
                  <button
                    onClick={handleStop}
                    disabled={phase === 'stopping'}
                    className="px-5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[13px] font-semibold text-red-400 border border-red-500/10 transition-all cursor-pointer"
                  >
                    {t('ym.stop')}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={!token.trim() || busy}
                  className="px-5 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 text-[13px] font-semibold text-accent border border-accent/20 transition-all cursor-pointer disabled:opacity-30"
                >
                  {t('ym.start')}
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default YMImportDialog;
