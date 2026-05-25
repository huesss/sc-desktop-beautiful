import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Sparkles, Star } from '../../../../lib/icons';
import { useSubscription } from '../../../../lib/subscription';
import { useAuthStore } from '../../../../stores/auth';
import { Countdown, isExpired } from './countdown';

const UNLOCK_AT = new Date('2025-05-25T12:00:00+03:00').getTime();
const BOOSTY_URL = 'https://boosty.to/lolinamide/purchase/3886747';

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  i,
  size: 2 + (i % 3),
  left: (i * 41) % 100,
  top: (i * 67) % 100,
  hue: 250 + ((i * 13) % 70),
  delay: (i * 0.27) % 5,
  duration: 4 + (i % 4),
  opacity: 0.35 + (i % 3) * 0.18,
}));

const STAR_GLYPHS = Array.from({ length: 10 }, (_, i) => ({
  i,
  size: 7 + ((i * 5) % 11),
  left: (i * 71) % 100,
  top: (i * 43) % 100,
  rotate: (i * 37) % 360,
  hue: 260 + ((i * 11) % 60),
  delay: (i * 0.4) % 4,
  duration: 5 + (i % 4),
  opacity: 0.25 + (i % 3) * 0.18,
}));

export const SoundWaveLockOverlay = React.memo(function SoundWaveLockOverlay() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: isPremium } = useSubscription(isAuthenticated);

  
  const [expired, setExpired] = useState(() => isExpired(UNLOCK_AT));
  const handleExpire = useCallback(() => setExpired(true), []);

  if (isPremium) return null;
  if (expired) return null;

  return (
    <div
      className="absolute inset-0 z-20 rounded-lg overflow-hidden"
      style={{ contain: 'layout paint style' }}
    >
      {}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(139,92,246,0.28) 0%, transparent 65%), linear-gradient(165deg, rgba(20,12,38,0.72) 0%, rgba(12,8,22,0.78) 55%, rgba(8,6,16,0.82) 100%)',
          contain: 'strict',
          transform: 'translateZ(0)',
        }}
      />

      {}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: '#141414', contain: 'strict',
          transform: 'translateZ(0)',
        }}
      />

      {}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ contain: 'strict', transform: 'translateZ(0)' }}
      >
        {STAR_GLYPHS.map((s) => (
          <div
            key={`g-${s.i}`}
            className="absolute"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              color: `hsl(${s.hue}, 85%, 78%)`,
              opacity: s.opacity,
              transform: `rotate(${s.rotate}deg)`,
              filter: `drop-shadow(0 0 ${s.size}px hsl(${s.hue}, 90%, 70%))`,
              animation: `star-float ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
            }}
          >
            <Star size={s.size} fill="currentColor" />
          </div>
        ))}
        {PARTICLES.map((p) => (
          <div
            key={`p-${p.i}`}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              background: `hsl(${p.hue}, 80%, 75%)`,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue}, 90%, 72%)`,
              animation: `star-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      {}
      <div
        className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center px-6 py-5"
        style={{ isolation: 'isolate' }}
      >
        {}
        <h3
          className="font-black uppercase leading-none mb-3 select-none"
          style={{
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            letterSpacing: '0.08em',
            background: '#141414', WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter:
              'drop-shadow(0 2px 8px rgba(168,85,247,0.45)) drop-shadow(0 0 28px rgba(139,92,246,0.35))',
          }}
        >
          {t('soundwaveLock.wordmark')}
        </h3>

        {}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.18em] text-white mb-4"
          style={{
            background: '#141414', border: '0.5px solid rgba(168,85,247,0.45)',
            boxShadow:
              'inset 0 0.5px 0 rgba(255,255,255,0.25), 0 0 24px rgba(168,85,247,0.45), 0 4px 14px rgba(0,0,0,0.35)',
          }}
        >
          <Sparkles size={10} className="text-amber-300" />
          {t('soundwaveLock.badge')}
        </div>

        {}
        <h2
          className="flex items-center justify-center gap-2.5 text-[26px] sm:text-[30px] font-bold tracking-tight text-white leading-tight"
          style={{
            background: '#141414', WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          {t('soundwaveLock.title')}
          <span
            className="inline-flex items-center justify-center text-amber-300"
            style={{
              filter:
                'drop-shadow(0 0 10px rgba(252,211,77,0.7)) drop-shadow(0 0 20px rgba(168,85,247,0.55))',
              WebkitTextFillColor: 'currentColor',
            }}
          >
            <Star size={28} fill="currentColor" />
          </span>
        </h2>

        {}
        <p className="text-[12.5px] text-purple-100/55 mt-2 font-medium tracking-wide">
          {t('soundwaveLock.subtitle')}
        </p>

        {}
        <Countdown target={UNLOCK_AT} onExpire={handleExpire} />

        {}
        <a
          href={BOOSTY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 mt-6 pl-5 pr-4 py-2.5 rounded-full text-[13.5px] font-bold tracking-tight text-white transition-all duration-200 ease-[var(--ease-apple)] hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
          style={{
            background: '#141414', border: '0.5px solid rgba(255,255,255,0.25)',
            boxShadow:
              '0 8px 28px rgba(139,92,246,0.55), 0 0 24px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
          }}
        >
          <Star
            size={14}
            fill="currentColor"
            className="text-amber-300"
            style={{ filter: 'drop-shadow(0 0 6px rgba(252,211,77,0.8))' }}
          />
          {t('soundwaveLock.cta')}
          <ExternalLink
            size={12}
            className="text-[#ffffff99] transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  );
});
