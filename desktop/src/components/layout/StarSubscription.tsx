import * as Dialog from '@radix-ui/react-dialog';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ExternalLink, Star, X } from '../../lib/icons';
import { useSubscription } from '../../lib/subscription';
import { useAuthStore } from '../../stores/auth';

export const StarHeroBackground = React.memo(() => null);

interface StarBadgeProps {
  size?: 'sm' | 'lg';
}

export const StarBadge = React.memo(({ size = 'sm' }: StarBadgeProps) => {
  const isLg = size === 'lg';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-accent/40 bg-accent/15 font-semibold uppercase text-accent ${
        isLg ? 'gap-1.5 px-2 py-0.5 text-[10px] tracking-wide' : 'gap-1 px-1.5 py-px text-[9px] tracking-wider'
      }`}
    >
      <Star size={isLg ? 11 : 9} fill="currentColor" />
      Star
    </span>
  );
});

interface StarCardProps {
  collapsed: boolean;
  isPremium: boolean;
  onOpenModal: () => void;
}

export const StarCard = React.memo(({ collapsed, isPremium, onOpenModal }: StarCardProps) => {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        title={t('star.title')}
        className="btn-secondary flex w-full items-center justify-center py-2.5"
      >
        <Star size={16} fill="currentColor" className="text-accent" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="btn-secondary flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
    >
      <Star size={16} fill="currentColor" className="shrink-0 text-accent" />
      <div className="flex min-w-0 flex-col items-start">
        <span className="text-[11px] font-semibold tracking-wide text-white">{t('star.title')}</span>
        <span className="text-[9px] font-medium text-white/50">
          {isPremium ? t('star.active') : t('star.getIt')}
        </span>
      </div>
    </button>
  );
});

const PERKS = [
  'star.perkGoPlus',
  'star.perkServer',
  'star.perkHQ',
  'star.bypassWhitelist',
  'star.perkSupport',
] as const;

const STEPS = [
  { key: 'star.step1', link: 'https://boosty.to/lolinamide' },
  { key: 'star.step2' },
  { key: 'star.step3', link: 'https://discord.gg/xQcGBP8fGG' },
  { key: 'star.step4' },
  { key: 'star.step5' },
] as const;

const PRIMARY_BTN = 'btn-primary h-9 px-3.5 text-[12px] tracking-tight';

const SECONDARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md text-[12px] font-medium tracking-tight text-white bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform] cursor-pointer outline-none';

export const StarModal = React.memo(
  ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
    const { t } = useTranslation();

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="font-inter fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#141414]">
                  <Star size={18} fill="currentColor" className="text-accent" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <Dialog.Title className="text-[17px] font-semibold tracking-tight text-white">
                    {t('star.modalTitle')}
                  </Dialog.Title>
                  <p className="mt-1 text-[12px] leading-snug text-white/50">{t('star.modalSub')}</p>
                </div>
              </div>
              <Dialog.Close className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-[#141414] text-white/50 transition-colors hover:bg-white/5 hover:text-white">
                <X size={14} />
              </Dialog.Close>
            </div>

            <div className="overflow-y-auto px-5 py-4 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
              <section>
                <ul className="divide-y divide-white/5 rounded-md border border-white/10 bg-[#141414]">
                  {PERKS.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 px-3.5 py-2.5">
                      <Check size={14} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                      <span className="text-[12.5px] leading-relaxed text-white/50 whitespace-pre-line">
                        {t(perk)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-6">
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {t('star.howTo')}
                </h3>
                <ol className="relative space-y-0 pl-1">
                  <div
                    className="pointer-events-none absolute left-[15px] top-3 bottom-3 w-px bg-white/10"
                    aria-hidden
                  />
                  {STEPS.map((step, i) => (
                    <li key={step.key} className="relative flex gap-3.5 pb-4 last:pb-0">
                      <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#141414] text-[11px] font-semibold tabular-nums text-accent">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-[12.5px] leading-relaxed text-white/50">{t(step.key)}</p>
                        {'link' in step && step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={i === 0 ? `${PRIMARY_BTN} mt-2.5` : `${SECONDARY_BTN} mt-2.5`}
                          >
                            {t(i === 0 ? 'star.goBoosty' : 'star.goDiscord')}
                            <ExternalLink size={11} className="opacity-70" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);

export function useStarSubscription() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: isPremium } = useSubscription(isAuthenticated);
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = useCallback(() => setModalOpen(true), []);

  return { isPremium: !!isPremium, modalOpen, setModalOpen, openModal };
}
