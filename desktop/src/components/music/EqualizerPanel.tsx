import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EQ_BAND_COUNT,
  EQ_LABELS,
  EQ_MAX_GAIN,
  EQ_MIN_GAIN,
  EQ_PRESETS,
} from '../../lib/equalizer';
import { AudioLines, Power, RotateCcw, X } from '../../lib/icons';
import { useSettingsStore } from '../../stores/settings';
import {
  PLAYBACK_RATE_DEFAULT,
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_RATE_STEP,
  usePlayerStore,
} from '../../stores/player';



const BandSlider = React.memo(function BandSlider({
  index,
  gain,
  label,
  onChange,
}: {
  index: number;
  gain: number;
  label: string;
  onChange: (index: number, gain: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const calcGain = useCallback((clientY: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round((pct * (EQ_MAX_GAIN - EQ_MIN_GAIN) + EQ_MIN_GAIN) * 2) / 2;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onChange(index, calcGain(e.clientY));
    },
    [index, onChange, calcGain],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      onChange(index, calcGain(e.clientY));
    },
    [index, onChange, calcGain],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  
  const pct = (gain - EQ_MIN_GAIN) / (EQ_MAX_GAIN - EQ_MIN_GAIN);
  const isPositive = gain > 0;
  const isNegative = gain < 0;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {}
      <span
        className={`text-[10px] tabular-nums font-semibold h-4 ${
          isPositive ? 'text-emerald-400' : isNegative ? 'text-blue-400' : 'text-[#ffffff99]'
        }`}
      >
        {gain > 0 ? '+' : ''}
        {gain.toFixed(1)}
      </span>

      {}
      <div
        ref={trackRef}
        className="relative w-7 h-[140px] flex items-center justify-center cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {}
        <div className="absolute w-[3px] h-full rounded-full bg-white/[0.06]" />

        {}
        <div className="absolute w-2 h-px bg-white/10 left-1/2 top-1/2 -translate-x-1/2" />

        {}
        <div
          className="absolute w-[3px] rounded-full left-1/2 -translate-x-1/2 transition-colors duration-150"
          style={{
            bottom: gain >= 0 ? '50%' : `${pct * 100}%`,
            top: gain >= 0 ? `${(1 - pct) * 100}%` : '50%',
            background: isPositive
              ? 'linear-gradient(to top, rgba(52,211,153,0.6), rgba(52,211,153,0.2))'
              : isNegative
                ? 'linear-gradient(to bottom, rgba(96,165,250,0.6), rgba(96,165,250,0.2))'
                : 'transparent',
          }}
        />

        {}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full transition-shadow duration-150 will-change-transform"
          style={{
            bottom: `calc(${pct * 100}% - 8px)`,
            background: isPositive
              ? 'rgb(52,211,153)'
              : isNegative
                ? 'rgb(96,165,250)'
                : 'rgba(255,255,255,0.5)',
            boxShadow:
              gain !== 0
                ? isPositive
                  ? '0 0 12px rgba(52,211,153,0.4)'
                  : '0 0 12px rgba(96,165,250,0.4)'
                : 'none',
          }}
        />
      </div>

      {}
      <span className="text-[9px] text-[#ffffff99] font-medium">{label}</span>
    </div>
  );
});



const PresetBtn = React.memo(function PresetBtn({
  id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer border ${
        active
          ? 'bg-white/[0.1] text-white border-white/[0.12] shadow-sm'
          : 'bg-[#0a0a0a] text-[#ffffff99] border-white/10 hover:bg-white/5 hover:text-[#ffffff99]'
      }`}
    >
      {label}
    </button>
  );
});



export const EqualizerPanel = React.memo(function EqualizerPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const eqEnabled = useSettingsStore((s) => s.eqEnabled);
  const eqGains = useSettingsStore((s) => s.eqGains);
  const eqPreset = useSettingsStore((s) => s.eqPreset);
  const setEqEnabled = useSettingsStore((s) => s.setEqEnabled);
  const setEqGains = useSettingsStore((s) => s.setEqGains);
  const setEqPreset = useSettingsStore((s) => s.setEqPreset);
  const setEqBand = useSettingsStore((s) => s.setEqBand);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const resetPlaybackRate = usePlayerStore((s) => s.resetPlaybackRate);

  const isRu = i18n.language === 'ru';

  const handleBandChange = useCallback(
    (index: number, gain: number) => {
      setEqBand(index, gain);
    },
    [setEqBand],
  );

  const handlePreset = useCallback(
    (id: string) => {
      const preset = EQ_PRESETS[id];
      if (preset) {
        setEqGains([...preset.gains]);
        setEqPreset(id);
      }
    },
    [setEqGains, setEqPreset],
  );

  const handleReset = useCallback(() => {
    setEqGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setEqPreset('flat');
  }, [setEqGains, setEqPreset]);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 animate-fade-in" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[95vw] animate-fade-in-up outline-none">
          <div className="bg-[#141414]/95 border border-white/10 rounded-lg shadow-2xl shadow-black/40 overflow-hidden">
            {}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <AudioLines size={18} className="text-[#ffffff99]" />
                </div>
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  {t('player.soundTuning')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {}
                <button
                  type="button"
                  onClick={() => setEqEnabled(!eqEnabled)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                    eqEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                      : 'bg-[#141414] text-[#ffffff99] border-white/10 hover:text-[#ffffff99]'
                  }`}
                >
                  <Power size={15} />
                </button>
                {}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-9 h-9 rounded-xl bg-[#141414] border border-white/10 flex items-center justify-center text-[#ffffff99] hover:text-[#ffffff99] transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                </button>
                {}
                <Dialog.Close className="w-9 h-9 rounded-xl bg-[#141414] border border-white/10 flex items-center justify-center text-[#ffffff99] hover:text-[#ffffff99] transition-all cursor-pointer">
                  <X size={15} />
                </Dialog.Close>
              </div>
            </div>

            {}
            <div
              className={`px-6 pb-4 transition-opacity duration-300 ${eqEnabled ? '' : 'opacity-30 pointer-events-none'}`}
            >
              <div className="flex items-end gap-0">
                {}
                <div className="flex flex-col justify-between h-[140px] mr-2 -mt-6">
                  <span className="text-[9px] text-white/20 tabular-nums">+12</span>
                  <span className="text-[9px] text-white/20 tabular-nums">0</span>
                  <span className="text-[9px] text-white/20 tabular-nums">-12</span>
                </div>
                {}
                <div className="flex-1 flex justify-between">
                  {Array.from({ length: EQ_BAND_COUNT }, (_, i) => (
                    <BandSlider
                      key={i}
                      index={i}
                      gain={eqGains[i] ?? 0}
                      label={EQ_LABELS[i]}
                      onChange={handleBandChange}
                    />
                  ))}
                </div>
              </div>
            </div>

            {}
            <div
              className={`px-6 pb-5 transition-opacity duration-300 ${eqEnabled ? '' : 'opacity-30 pointer-events-none'}`}
            >
              <p className="text-[11px] text-[#ffffff99] font-medium mb-2.5">{t('eq.preset')}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(EQ_PRESETS).map(([id, preset]) => (
                  <PresetBtn
                    key={id}
                    id={id}
                    label={isRu ? preset.labelRu : preset.label}
                    active={eqPreset === id}
                    onClick={handlePreset}
                  />
                ))}
                {eqPreset === 'custom' && (
                  <PresetBtn id="custom" label={t('eq.custom')} active onClick={() => {}} />
                )}
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-white">{t('player.playbackSpeed')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] tabular-nums text-white/70">
                    {playbackRate.toFixed(2)}x
                  </span>
                  <button
                    type="button"
                    onClick={resetPlaybackRate}
                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/55 transition-colors hover:text-white"
                  >
                    {t('player.playbackSpeedReset')}
                  </button>
                </div>
              </div>
              <Slider.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                min={PLAYBACK_RATE_MIN}
                max={PLAYBACK_RATE_MAX}
                step={PLAYBACK_RATE_STEP}
                value={[playbackRate]}
                onValueChange={([value]) => setPlaybackRate(value)}
              >
                <Slider.Track className="relative h-1.5 grow rounded-full bg-white/10">
                  <Slider.Range className="absolute h-full rounded-full bg-accent" />
                </Slider.Track>
                <Slider.Thumb className="block size-4 rounded-full border border-white/20 bg-white shadow-md focus:outline-none" />
              </Slider.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
