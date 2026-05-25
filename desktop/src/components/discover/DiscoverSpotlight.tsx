import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type Aura } from '../../lib/aura';
import { type CatalogAlbum, type CatalogArtist, useDiscoverSpotlight } from '../../lib/discover';
import { dur, fc } from '../../lib/formatters';
import { Disc3, Headphones, ListMusic, Sparkles, Star } from '../../lib/icons';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import { Skeleton } from '../ui/Skeleton';
import { monogramOf } from './visuals';

interface DiscoverSpotlightProps {
  aura: Aura;
}

function DiscoverSpotlightImpl({ aura: _aura }: DiscoverSpotlightProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useDiscoverSpotlight();
  const items = data?.items ?? [];

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="w-8 h-8 rounded-md bg-[#141414] border border-white/10 flex items-center justify-center">
          <Sparkles size={14} className="text-[#ffffff99]" />
        </span>
        <h2 className="text-[15px] font-semibold text-white tracking-tight">
          {t('discover.spotlightTitle')}
          {items.length > 0 && (
            <span className="ml-2 text-[13px] font-medium tabular-nums text-[#ffffff99]">
              {items.length}
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <HorizontalScroll className="px-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-[240px] h-[300px] rounded-lg" />
          ))}
        </HorizontalScroll>
      ) : (
        <HorizontalScroll className="px-1">
          {items.map((it) =>
            it.kind === 'album' ? (
              <AlbumSpotlightCard key={`al-${it.album.id}`} album={it.album} />
            ) : (
              <ArtistSpotlightCard key={`ar-${it.artist.id}`} artist={it.artist} />
            ),
          )}
        </HorizontalScroll>
      )}
    </section>
  );
}

const AlbumSpotlightCard = memo(function AlbumSpotlightCard({ album }: { album: CatalogAlbum }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initials = monogramOf(album.title);
  const kindLabel = t(`artist.kind.${album.type}`, { defaultValue: album.type });

  return (
    <button
      type="button"
      onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
      className="group relative shrink-0 w-[240px] h-[300px] rounded-lg border border-white/10 bg-[#0a0a0a] cursor-pointer overflow-hidden transition-colors hover:bg-[#141414] text-left"
    >
      {album.cover_url ? (
        <img
          src={album.cover_url}
          alt={album.title}
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-90"
          decoding="async"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#141414]">
          <span className="text-white/30 font-semibold text-5xl tracking-tight select-none">
            {initials}
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-[#0a0a0a]/55 pointer-events-none" />

      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider text-[#ffffff99] bg-[#0a0a0a]/80 border border-white/10">
          <Disc3 size={10} /> {kindLabel}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#ffffff99] truncate">
          {album.primary_artist.name}
        </p>
        <p className="text-[18px] font-semibold leading-tight text-white tracking-tight truncate">
          {album.title}
        </p>
        <div className="flex items-center gap-2 text-[13px] text-[#ffffff99] tabular-nums">
          <span className="inline-flex items-center gap-1">
            <ListMusic size={10} /> {album.track_count}
          </span>
          {album.total_duration_ms > 0 && (
            <>
              <span>·</span>
              <span>{dur(album.total_duration_ms)}</span>
            </>
          )}
          {album.release_year && (
            <>
              <span>·</span>
              <span>{album.release_year}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
});

const ArtistSpotlightCard = memo(function ArtistSpotlightCard({
  artist,
}: {
  artist: CatalogArtist;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initials = monogramOf(artist.name);

  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${encodeURIComponent(artist.id)}`)}
      className="group relative shrink-0 w-[240px] h-[300px] rounded-lg border border-white/10 bg-[#0a0a0a] cursor-pointer overflow-hidden transition-colors hover:bg-[#141414] text-left flex flex-col"
    >
      <div className="relative flex flex-col items-center pt-8 px-5 flex-1">
        <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden border border-white/10 bg-[#141414]">
          {artist.avatar_url ? (
            <img
              src={artist.avatar_url}
              alt={artist.name}
              className="w-full h-full object-cover"
              decoding="async"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/30 font-semibold text-2xl tracking-tight select-none">
                {initials}
              </span>
            </div>
          )}
          {artist.star && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center bg-accent border border-white/10">
              <Star size={12} className="text-white" fill="currentColor" />
            </div>
          )}
        </div>

        <p className="mt-4 text-[17px] font-semibold leading-tight tracking-tight text-white text-center truncate w-full">
          {artist.name}
        </p>
        {artist.country && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#ffffff99]">
            {artist.country}
          </p>
        )}

        {artist.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {artist.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider text-[#ffffff99] bg-white/[.03] border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-white/10 mt-auto">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-[#ffffff99]">
          <Headphones size={11} />
          {fc(artist.monthly_listeners)}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium tabular-nums px-2 py-0.5 rounded-md bg-[#141414] border border-white/10 text-white">
          {t('discover.trendValue', { value: Math.round(artist.trending * 100) })}
        </span>
      </div>
    </button>
  );
});

export const DiscoverSpotlight = memo(DiscoverSpotlightImpl);
