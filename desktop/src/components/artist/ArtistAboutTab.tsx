import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type Aura, auraRgba } from '../../lib/aura';
import { Check, Globe, MicVocal } from '../../lib/icons';
import { SocialIcon, socialLabel } from './socials';
import type { ArtistDetail } from './types';

interface ArtistAboutTabProps {
  artist: ArtistDetail;
  aura: Aura;
}

function ArtistAboutTabImpl({ artist, aura }: ArtistAboutTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="grid lg:grid-cols-3 gap-3 py-2">
      {}
      <div
        className="lg:col-span-2 p-7 rounded-lg"
        style={{
          background: '#141414', border: '0.5px solid rgba(255,255,255,0.07)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.06)',
        }}
      >
        <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffffff99] mb-4 flex items-center gap-2">
          <MicVocal size={11} /> {t('artist.aboutTitle')}
        </h3>
        {artist.bio ? (
          <p className="text-[15px] text-[#ffffff99] leading-relaxed whitespace-pre-line">
            {artist.bio}
          </p>
        ) : (
          <p className="text-[13px] text-[#ffffff99] italic">{t('artist.noBio')}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {artist.country && (
            <Stat icon={<Globe size={12} />} label={t('artist.country')} value={artist.country} />
          )}
          <Stat
            icon={<Check size={12} className="text-emerald-400" />}
            label={t('artist.confidence')}
            value={`${(artist.confidence * 100).toFixed(0)}%`}
          />
        </div>
      </div>

      {}
      <div className="flex flex-col gap-3">
        {artist.sc_accounts.length > 0 && (
          <div
            className="p-5 rounded-lg"
            style={{
              background: '#141414', border: '0.5px solid rgba(0,168,67,0.18)',
              boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.06)`,
            }}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300/80 mb-3 flex items-center gap-2">
              <SocialIcon kind="soundcloud" size={11} />
              {t('artist.scAccounts')}
            </h3>
            <div className="flex flex-col gap-2">
              {artist.sc_accounts.map((acc) => (
                <button
                  key={acc.sc_user_id}
                  type="button"
                  onClick={() =>
                    navigate(`/user/${encodeURIComponent(`soundcloud:users:${acc.sc_user_id}`)}`)
                  }
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer hover:scale-[1.02] transition-all"
                  style={{
                    background: 'rgba(0,168,67,0.08)',
                    border: '0.5px solid rgba(0,168,67,0.16)',
                  }}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#141414]">
                    <SocialIcon kind="soundcloud" size={14} className="text-orange-300" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#ffffff99] truncate">
                      {acc.role === 'main'
                        ? t('artist.mainAccount')
                        : acc.role === 'demo'
                          ? t('artist.demoAccount')
                          : acc.role}
                    </p>
                    <p className="text-[10px] text-[#ffffff99] tabular-nums truncate">
                      ID {acc.sc_user_id}
                    </p>
                  </div>
                  {acc.verified && <Check size={12} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {artist.socials.length > 0 && (
          <div
            className="p-5 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffffff99] mb-3">
              {t('artist.links')}
            </h3>
            <div className="flex flex-col gap-1">
              {artist.socials.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] text-[#ffffff99] hover:text-white transition-colors hover:bg-[#141414]"
                  style={{ border: '0.5px solid transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = auraRgba(aura, 0.3);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-[#ffffff99] group-hover:text-white">
                    <SocialIcon kind={s.kind} size={13} />
                  </span>
                  <span className="flex-1 truncate font-medium">{socialLabel(s.kind)}</span>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-bold">
                    {s.source}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Stat = memo(
  ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className="text-[#ffffff99]">{icon}</span>
      <span className="text-[#ffffff99] uppercase tracking-[0.18em] text-[10px]">{label}</span>
      <span className="text-[#ffffff99]">{value}</span>
    </span>
  ),
);

export const ArtistAboutTab = memo(ArtistAboutTabImpl);
