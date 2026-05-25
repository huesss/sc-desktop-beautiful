import React from 'react';

export const Spinner = React.memo(function Spinner({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-accent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
});

export const loaderIconClass = 'animate-spin text-accent';
