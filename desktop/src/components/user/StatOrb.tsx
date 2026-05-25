import React from 'react';
import { fc } from '../../lib/formatters';

interface StatOrbProps {
  value: number | null | undefined;
  label: string;
  accent?: string;
}

function StatOrbImpl({ value, label }: StatOrbProps) {
  return (
    <div className="rounded-md border border-white/10 bg-[#141414] px-4 py-3">
      <div className="text-xl font-semibold tabular-nums tracking-tight text-white">
        {value != null ? fc(value) : '—'}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-[#ffffff99]">{label}</div>
    </div>
  );
}

export const StatOrb = React.memo(StatOrbImpl);
