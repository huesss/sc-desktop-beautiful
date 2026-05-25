import { useTranslation } from 'react-i18next';
import { type Aura } from '../../lib/aura';
import { art, fc } from '../../lib/formatters';
import { Calendar, Globe, Users } from '../../lib/icons';
import { CopyLinkButton } from '../ui/CopyLinkButton';
import { AuraPicker } from './AuraPicker';
import { FollowBtn } from './FollowBtn';
import { getWebIcon, InfoChip, ProChip, VerifiedBadge } from './UserChips';

function dateFormattedLong(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(/\//g, '-').replace(' +0000', 'Z'));
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

interface IdentityHubProps {
  user: {
    urn: string;
    username: string;
    full_name?: string | null;
    description?: string | null;
    avatar_url?: string | null;
    permalink_url?: string | null;
    plan?: string | null;
    verified?: boolean;
    created_at?: string | null;
    city?: string | null;
    country_code?: string | null;
    followers_count?: number | null;
    followings_count?: number | null;
    track_count?: number | null;
    public_favorites_count?: number | null;
  };
  hasStar: boolean;
  webProfiles:
    | Array<{ id: number | string; url: string; service: string; title: string }>
    | undefined;
  aura: Aura;
  isOwnProfile: boolean;
  customHex: string;
  onPickAura: (a: Aura) => void;
  onPickCustom: (hex: string) => void;
}

function ProfileStat({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <div className="min-w-[72px]">
      <p className="text-lg font-bold tabular-nums text-white leading-none">
        {value != null ? fc(value) : '—'}
      </p>
      <p className="mt-1 text-[11px] font-medium text-[#ffffff99]">{label}</p>
    </div>
  );
}

export function IdentityHub({
  user,
  hasStar,
  webProfiles,
  aura,
  isOwnProfile,
  customHex,
  onPickAura,
  onPickCustom,
}: IdentityHubProps) {
  const { t } = useTranslation();
  const formattedDate = dateFormattedLong(user.created_at);
  const country = [user.city, user.country_code].filter(Boolean).join(', ');
  const avatar = art(user.avatar_url);

  return (
    <section
      className={`relative overflow-hidden rounded-lg border bg-[#0a0a0a] ${
        hasStar ? 'border-accent/25' : 'border-white/10'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 28%, transparent) 0%, transparent 55%)',
        }}
      />

      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
        <div className="relative shrink-0 mx-auto md:mx-0">
          <div className="size-[168px] overflow-hidden rounded-md border border-white/10 bg-[#141414] md:size-[192px]">
            {avatar ? (
              <img src={avatar} alt="" className="size-full object-cover" decoding="async" />
            ) : (
              <div className="flex size-full items-center justify-center text-[#ffffff99]">
                <Users size={48} />
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {user.verified && <VerifiedBadge title={t('user.verifiedArtist')} />}
            {user.plan && user.plan !== 'Free' && <ProChip plan={user.plan} />}
            {formattedDate && <InfoChip icon={<Calendar size={11} />}>{formattedDate}</InfoChip>}
            {country && <InfoChip icon={<Globe size={11} />}>{country}</InfoChip>}
          </div>

          <div>
            <h1 className="text-[40px] font-bold leading-none tracking-tight text-white md:text-[52px]">
              {user.username}
            </h1>
            {user.full_name && user.full_name !== user.username && (
              <p className="mt-2 text-[14px] font-medium text-[#ffffff99]">{user.full_name}</p>
            )}
          </div>

          {user.description && (
            <p className="max-w-2xl text-[14px] leading-relaxed text-[#ffffff99] line-clamp-4">
              {user.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 md:justify-start">
            <ProfileStat value={user.followers_count} label={t('user.followers')} />
            <ProfileStat value={user.followings_count} label={t('user.following')} />
            <ProfileStat value={user.track_count} label={t('user.tracks')} />
            <ProfileStat value={user.public_favorites_count} label={t('user.likes')} />
          </div>

          {webProfiles && webProfiles.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
              {webProfiles.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#141414] px-3 py-1.5 text-[11px] font-medium text-[#ffffff99] transition-colors hover:text-white"
                >
                  <span className="text-[#ffffff99]">{getWebIcon(link.service)}</span>
                  <span className="max-w-[160px] truncate">{link.title}</span>
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 md:justify-start">
            {!isOwnProfile && <FollowBtn userUrn={user.urn} aura={aura} />}
            {user.permalink_url && (
              <div className="inline-flex h-9 items-center rounded-md border border-white/10 bg-[#141414] px-1">
                <CopyLinkButton url={user.permalink_url} />
              </div>
            )}
            {hasStar && isOwnProfile && (
              <AuraPicker
                aura={aura}
                onPickAura={onPickAura}
                customHex={customHex}
                onPickCustom={onPickCustom}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
