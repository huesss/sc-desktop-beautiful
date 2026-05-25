import React from 'react';
import { art } from '../../lib/formatters';
import { Users } from '../../lib/icons';
interface AvatarArtifactProps {
  username: string;
  avatarUrl: string | null | undefined;
  hasStar: boolean;
  aura: unknown;
}

function AvatarArtifactImpl({ username, avatarUrl }: AvatarArtifactProps) {
  const url = art(avatarUrl, 't500x500');
  return (
    <div className="relative shrink-0 self-center lg:self-start">
      <div className="relative size-28 overflow-hidden rounded-md border border-white/10 bg-[#141414] md:size-32">
        {url ? (
          <img src={url} alt={username} className="size-full object-cover" decoding="async" />
        ) : (
          <div className="flex size-full items-center justify-center text-[#ffffff99]">
            <Users size={40} />
          </div>
        )}
      </div>
    </div>
  );
}

export const AvatarArtifact = React.memo(AvatarArtifactImpl);
