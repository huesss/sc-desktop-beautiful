import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: boolean;
}

export function GlassCard({
  children,
  hover = false,
  padding = true,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`border border-white/10 bg-[#0a0a0a] rounded-xl ${hover ? 'transition-colors duration-150 hover:bg-white/[.03]' : ''} ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
