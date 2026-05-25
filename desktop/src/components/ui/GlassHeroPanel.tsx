import type React from 'react';
import { memo } from 'react';
import type { Aura } from '../../lib/aura';

interface GlassHeroPanelProps {
  hasStar: boolean;
  aura: Aura;
  className?: string;
  children: React.ReactNode;
}

function GlassHeroPanelImpl({ hasStar, className, children }: GlassHeroPanelProps) {
  return (
    <div
      className={`relative rounded-lg border bg-[#0a0a0a] ${
        hasStar ? 'border-accent/25' : 'border-white/10'
      } ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export const GlassHeroPanel = memo(GlassHeroPanelImpl);
