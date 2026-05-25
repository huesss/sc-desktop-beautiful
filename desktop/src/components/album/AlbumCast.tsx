import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Aura } from '../../lib/aura';
import { Avatar } from '../ui/Avatar';
import type { AlbumArtist } from './types';

const ROLE_LABEL_KEY: Record<string, string> = {
  primary: 'album.primaryArtist',
  featured: 'album.featured',
  remixer: 'album.remixer',
  producer: 'album.producer',
};

function AlbumCastImpl({ artists, aura: _aura }: { artists: AlbumArtist[]; aura: Aura }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!artists.length) return null;

  return (
    <section className="rounded-lg border border-white/10 bg-[#0a0a0a]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-medium text-white">{t('album.cast', 'Cast')}</h2>
      </div>
      <ul className="flex flex-col divide-y divide-white/10 px-5 py-2">
        {artists.map((artist) => (
          <li key={`${artist.id}-${artist.role}`}>
            <button
              type="button"
              onClick={() => navigate(`/artist/${encodeURIComponent(artist.id)}`)}
              className="flex w-full items-center gap-2.5 rounded-md py-2 text-left transition-colors hover:bg-white/5"
            >
              <Avatar src={artist.avatar_url} alt={artist.name} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{artist.name}</span>
                <span className="block text-[12px] text-[#ffffff99]">
                  {ROLE_LABEL_KEY[artist.role]
                    ? t(ROLE_LABEL_KEY[artist.role])
                    : artist.role}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const AlbumCast = memo(AlbumCastImpl);
