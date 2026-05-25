import React from 'react';
import { Check, Globe, Instagram, LinkIcon, Twitter, Youtube } from '../../lib/icons';

export const VerifiedBadge = React.memo(function VerifiedBadge({ title }: { title: string }) {
  return (
    <div
      className="flex size-6 items-center justify-center rounded-full border border-white/10 bg-[#141414]"
      title={title}
    >
      <Check size={13} className="text-accent" strokeWidth={3} />
    </div>
  );
});

export const ProChip = React.memo(function ProChip({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
      {plan}
    </span>
  );
});

export const InfoChip = React.memo(function InfoChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#141414] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#ffffff99]">
      <span className="text-[#ffffff99]">{icon}</span>
      {children}
    </span>
  );
});

export function getWebIcon(service: string) {
  switch (service.toLowerCase()) {
    case 'instagram':
      return <Instagram size={14} />;
    case 'twitter':
      return <Twitter size={14} />;
    case 'youtube':
      return <Youtube size={14} />;
    case 'personal':
      return <Globe size={14} />;
    default:
      return <LinkIcon size={14} />;
  }
}
