import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from '../../lib/icons';
import { AURAS, type Aura } from '../../lib/aura';

interface AuraPickerProps {
  aura: Aura;
  onPickAura: (a: Aura) => void;
  customHex: string;
  onPickCustom: (hex: string) => void;
}

function AuraPickerImpl({ aura, onPickAura, customHex, onPickCustom }: AuraPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#141414] p-2">
      <span className="flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-[#ffffff99]">
        <Sparkles size={11} />
        {t('user.auraTitle')}
      </span>
      {AURAS.map((a) => {
        const active = a.id === aura.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPickAura(a)}
            title={a.name}
            className={`size-7 rounded-md border transition-colors ${
              active
                ? 'border-accent ring-2 ring-accent/30'
                : 'border-white/10 hover:border-white/20'
            }`}
            style={{ backgroundColor: a.orbs[0] }}
          />
        );
      })}
      <label
        className={`relative size-7 cursor-pointer overflow-hidden rounded-md border ${
          aura.id === 'custom'
            ? 'border-accent ring-2 ring-accent/30'
            : 'border-white/10 hover:border-white/20'
        }`}
        title={t('user.auraCustom')}
        style={{ backgroundColor: customHex }}
      >
        <input
          type="color"
          value={customHex}
          onChange={(e) => onPickCustom(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Sparkles size={10} className="text-white/80" />
        </span>
      </label>
    </div>
  );
}

export const AuraPicker = React.memo(AuraPickerImpl);
