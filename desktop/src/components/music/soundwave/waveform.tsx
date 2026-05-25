import React, { useEffect, useMemo, useRef } from 'react';
import { getCurrentTime, getDuration, seek, subscribe } from '../../../lib/audio';
import { useTrackWaveform } from '../../../lib/waveform';
import type { Track } from '../../../stores/player';

const BAR_COUNT = 160;


function downsample(samples: number[], height: number, count: number): number[] {
  if (!samples.length) return new Array(count).fill(0.35);
  const bucketSize = samples.length / count;
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end && j < samples.length; j++) {
      sum += samples[j];
      n++;
    }
    const avg = n > 0 ? sum / n / height : 0.35;
    out[i] = 0.18 + Math.min(0.82, avg * 0.95);
  }
  return out;
}


const FALLBACK_BARS = (() => {
  const arr = new Array<number>(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    const x = i / BAR_COUNT;
    const base = 0.35 + 0.28 * Math.sin(x * Math.PI * 2);
    const detail = 0.18 * Math.sin(x * Math.PI * 14 + 1.3);
    arr[i] = Math.max(0.22, Math.min(0.95, base + detail));
  }
  return arr;
})();

interface Props {
  
  track: Track | null;
  
  isCurrent: boolean;
}






export const LiveWaveform = React.memo(
  function LiveWaveform({ track, isCurrent }: Props) {
    const { data: samples, isLoading } = useTrackWaveform(track);

    const bars = useMemo(() => {
      if (!samples) return FALLBACK_BARS;
      return downsample(samples.values, samples.height, BAR_COUNT);
    }, [samples]);

    const rootRef = useRef<HTMLDivElement>(null);
    const hintRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isCurrent) {
        if (rootRef.current) rootRef.current.style.setProperty('--sw-progress', '0%');
        if (hintRef.current) hintRef.current.style.left = '0%';
        return;
      }
      const paint = () => {
        const t = getCurrentTime();
        const d = getDuration();
        const pct = d > 0 ? Math.min(100, Math.max(0, (t / d) * 100)) : 0;
        if (rootRef.current) rootRef.current.style.setProperty('--sw-progress', `${pct}%`);
        if (hintRef.current) hintRef.current.style.left = `${pct}%`;
      };
      paint();
      return subscribe(paint);
    }, [isCurrent]);

    const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCurrent) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const d = getDuration();
      if (d > 0) seek(pct * d);
    };

    return (
      <div
        ref={rootRef}
        className={`sw-bars relative w-full h-[96px] ${isCurrent ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleBarClick}
      >
        <div className="sw-layer-muted absolute inset-0 flex items-center gap-[2px]">
          {bars.map((v, i) => (
            <div key={i} className="sw-bar flex-1" style={{ height: `${v * 100}%` }} />
          ))}
        </div>
        <div className="sw-layer-accent absolute inset-0 flex items-center gap-[2px]">
          {bars.map((v, i) => (
            <div key={i} className="sw-bar flex-1" style={{ height: `${v * 100}%` }} />
          ))}
        </div>
        {isLoading && (
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background: '#141414', backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s ease-in-out infinite',
            }}
          />
        )}
        {isCurrent && (
          <div
            ref={hintRef}
            className="absolute top-0 bottom-0 w-[2px] pointer-events-none rounded-full"
            style={{
              left: '0%',
              background: 'var(--color-accent)',
              boxShadow: '0 0 8px var(--color-accent-glow), 0 0 16px var(--color-accent-glow)',
              willChange: 'left',
            }}
          />
        )}
      </div>
    );
  },
  (prev, next) => prev.track?.urn === next.track?.urn && prev.isCurrent === next.isCurrent,
);
