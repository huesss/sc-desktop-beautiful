import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

export const ClusterHeader = React.memo(function ClusterHeader({
  icon,
  title,
  description,
  index,
}: Props) {
  return (
    <div className="flex items-end gap-2 pl-1">
      <div
        className="relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
        style={{
          background: '#141414', border: '0.5px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
          boxShadow: '0 0 22px var(--color-accent-glow), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {icon}
        <span
          className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black tabular-nums text-[#ffffff99]"
          style={{
            background: 'rgba(0,0,0,0.55)',
            border: '0.5px solid color-mix(in srgb, var(--color-accent) 45%, transparent)',
          }}
        >
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <h3
          className="text-[15px] md:text-[16px] font-black tracking-tight leading-none text-white"
          style={{ textShadow: '0 0 24px var(--color-accent-glow)' }}
        >
          {title}
        </h3>
        <p className="text-[11.5px] text-[#ffffff99] leading-snug">{description}</p>
      </div>
      <div className="mb-1.5 hidden h-px flex-1 self-end bg-white/10 md:block" />
    </div>
  );
});
