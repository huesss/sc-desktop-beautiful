import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Aura } from '../../lib/aura';
import { fc } from '../../lib/formatters';
import { Compass, Disc3, MicVocal, Sparkles } from '../../lib/icons';
import { GlassHeroPanel } from '../ui/GlassHeroPanel';
import { Skeleton } from '../ui/Skeleton';

interface DiscoverHeroProps {
  aura: Aura;
  artistsCount: number | null;
  albumsCount: number | null;
  freshCount: number | null;
  isLoading: boolean;
  onSurpriseMe: () => void;
  isSurprising: boolean;
}

function DiscoverHeroImpl({
  aura,
  artistsCount,
  albumsCount,
  freshCount,
  isLoading,
  onSurpriseMe,
  isSurprising,
}: DiscoverHeroProps) {
  const { t } = useTranslation();

  return (
    <GlassHeroPanel hasStar={false} aura={aura}>
      <div className="relative px-5 py-4 md:px-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-stretch">
        <CompassArtifact />

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3 text-center lg:text-left">
          <h1 className="text-3xl md:text-5xl font-semibold leading-tight tracking-tight text-white">
            {t('discover.title')}
          </h1>

          <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start text-[13px] text-[#ffffff99]">
            <MetaPill
              icon={<MicVocal size={11} />}
              text={
                artistsCount == null
                  ? t('common.loading')
                  : t('discover.metaArtists', { count: artistsCount })
              }
              loading={isLoading && artistsCount == null}
            />
            <span className="text-white/15">·</span>
            <MetaPill
              icon={<Disc3 size={11} />}
              text={
                albumsCount == null
                  ? t('common.loading')
                  : t('discover.metaAlbums', { count: albumsCount })
              }
              loading={isLoading && albumsCount == null}
            />
            <span className="text-white/15">·</span>
            <MetaPill
              icon={<Sparkles size={11} />}
              text={
                freshCount == null
                  ? t('common.loading')
                  : t('discover.metaFresh', { count: freshCount })
              }
              loading={isLoading && freshCount == null}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 justify-center lg:justify-start">
            <button
              type="button"
              onClick={onSurpriseMe}
              disabled={isSurprising}
              className="btn-primary inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-[13px] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >
              <Sparkles size={14} />
              {t('discover.surpriseMe')}
            </button>
          </div>
        </div>

        <div className="hidden xl:flex flex-col gap-2 self-stretch min-w-[200px]">
          <Stat
            value={artistsCount}
            label={t('discover.statArtists')}
            icon={<MicVocal size={12} />}
            loading={isLoading && artistsCount == null}
          />
          <Stat
            value={albumsCount}
            label={t('discover.statAlbums')}
            icon={<Disc3 size={12} />}
            loading={isLoading && albumsCount == null}
          />
          <Stat
            value={freshCount}
            label={t('discover.statFresh')}
            icon={<Sparkles size={12} />}
            highlight
            loading={isLoading && freshCount == null}
          />
        </div>
      </div>
    </GlassHeroPanel>
  );
}

const MetaPill = memo(function MetaPill({
  icon,
  text,
  loading,
}: {
  icon: React.ReactNode;
  text: string;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-3 w-16 rounded-md" />;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
});

const Stat = memo(function Stat({
  value,
  label,
  icon,
  highlight,
  loading,
}: {
  value: number | null;
  label: string;
  icon: React.ReactNode;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`px-4 py-2.5 rounded-md flex items-baseline gap-2 border border-white/10 ${
        highlight ? 'bg-accent/10' : 'bg-white/[.03]'
      }`}
    >
      <span className="text-[#ffffff99]">{icon}</span>
      {loading || value == null ? (
        <Skeleton className="h-5 w-16 rounded-md" />
      ) : (
        <span className="text-lg font-semibold tabular-nums tracking-tight text-white">
          {fc(value)}
        </span>
      )}
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#ffffff99]">
        {label}
      </span>
    </div>
  );
});

const CompassArtifact = memo(function CompassArtifact() {
  return (
    <div className="relative shrink-0 self-center lg:self-start w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-lg border border-white/10 bg-[#141414] flex items-center justify-center">
      <Compass size={64} strokeWidth={1.2} className="text-[#ffffff99]" />
    </div>
  );
});

export const DiscoverHero = memo(DiscoverHeroImpl);
