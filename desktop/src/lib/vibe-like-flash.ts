const DURATION_MS = 1800;
const PEAK = 0.55;

let animStart = 0;

export function isVibeRoute() {
  return typeof window !== 'undefined' && window.location.pathname.includes('/vibe');
}

export function triggerVibeLikeFlash() {
  animStart = performance.now();
}

export function tickVibeLikeFlash(now = performance.now()): number {
  if (animStart <= 0) return 0;

  const t = (now - animStart) / DURATION_MS;
  if (t >= 1) {
    animStart = 0;
    return 0;
  }

  let v: number;
  if (t < 0.12) {
    v = (t / 0.12) * (t / 0.12);
  } else if (t < 0.35) {
    v = 1;
  } else {
    const u = (t - 0.35) / 0.65;
    v = 1 - u * u;
  }

  return v * PEAK;
}
