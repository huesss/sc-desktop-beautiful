import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/player';

const VIS_BINS = 64;
const BEAT_REFRACTORY_MS = 72;
const PULSE_RELEASE_PER_SEC = 12;
const ONSET_HISTORY = 28;
const KICK_HISTORY = 18;

type VibeFeatures = {
  pulse: number;
  beat: number;
  kick: number;
  bass: number;
  sub: number;
  mid: number;
  vocal: number;
  rhythm: number;
  energy: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function bandAverage(bins: ArrayLike<number>, from: number, to: number, weight = 0) {
  const end = Math.min(to, bins.length);
  if (from >= end) return 0;
  let sum = 0;
  let weightSum = 0;
  for (let i = from; i < end; i++) {
    const w = 1 + weight * (1 - (i - from) / Math.max(1, end - from - 1));
    sum += bins[i] * w;
    weightSum += w;
  }
  return sum / Math.max(1, weightSum);
}

function bandPeak(bins: ArrayLike<number>, from: number, to: number) {
  const end = Math.min(to, bins.length);
  let peak = 0;
  for (let i = from; i < end; i++) {
    if (bins[i] > peak) peak = bins[i];
  }
  return peak;
}

function readStats(values: Float32Array, count: number, fallbackMean: number, fallbackDev: number) {
  if (count <= 4) return { mean: fallbackMean, dev: fallbackDev };
  let mean = 0;
  for (let i = 0; i < count; i++) mean += values[i];
  mean /= count;
  let variance = 0;
  for (let i = 0; i < count; i++) {
    const d = values[i] - mean;
    variance += d * d;
  }
  return { mean, dev: Math.sqrt(variance / count) };
}

function pushHistory(history: { values: Float32Array; index: number; count: number }, value: number) {
  history.values[history.index] = value;
  history.index = (history.index + 1) % history.values.length;
  history.count = Math.min(history.values.length, history.count + 1);
}

export function useVibeAnalyser() {
  const stateRef = useRef({
    bass: 0,
    bassAvg: 0.12,
    mid: 0,
    fluxAvg: 0.02,
    onsetAvg: 0.03,
    onsetDev: 0.02,
    kickOnsetAvg: 0.02,
    kickOnsetDev: 0.015,
    pulse: 0,
    beat: 0,
    rhythm: 0,
    energy: 0,
    kickEnv: 0.08,
    subEnv: 0.08,
    prevBass: 0,
    prevKick: 0,
    prevSub: 0,
    prevOnset: 0,
    prevKickOnset: 0,
    prevFrameAt: 0,
    lastBeat: 0,
    lastNativeAt: 0,
  });
  const prevBinsRef = useRef<Float32Array>(new Float32Array(VIS_BINS));
  const onsetHistoryRef = useRef({
    values: new Float32Array(ONSET_HISTORY),
    index: 0,
    count: 0,
  });
  const kickHistoryRef = useRef({
    values: new Float32Array(KICK_HISTORY),
    index: 0,
    count: 0,
  });

  const processFft = useCallback((bins: ArrayLike<number>) => {
    if (performance.now() - stateRef.current.lastNativeAt < 120) return;
    const n = Math.min(VIS_BINS, bins.length);
    const prev = prevBinsRef.current;
    const s = stateRef.current;
    const onsetHistory = onsetHistoryRef.current;
    const kickHistory = kickHistoryRef.current;

    const sub = bandAverage(bins, 1, 6, 1.35);
    const kick = bandAverage(bins, 2, 13, 0.95) * 0.62 + bandPeak(bins, 2, 13) * 0.38;
    const bass = bandAverage(bins, 1, 16, 0.95);
    const punch = bandAverage(bins, 6, 18, 0.55);
    const lowMid = bandAverage(bins, 12, 25, 0.3);
    const mid = bandAverage(bins, 24, 42);
    const vocal = bandAverage(bins, 18, 36, 0.1);

    let flux = 0;
    let kickFlux = 0;
    for (let i = 1; i < Math.min(26, n); i++) {
      const d = bins[i] - prev[i];
      if (d > 0) {
        flux += d * (i < 12 ? 1.45 : 0.45);
        if (i < 14) kickFlux += d * (i < 7 ? 1.9 : 1.15);
      }
      prev[i] = bins[i];
    }
    for (let i = Math.min(26, n); i < n; i++) prev[i] = bins[i];
    flux /= Math.max(1, Math.min(25, n - 1));
    kickFlux /= Math.max(1, Math.min(13, n - 1));

    const bassJump = bass - s.prevBass;
    const kickJump = kick - s.prevKick;
    const subJump = sub - s.prevSub;
    s.prevBass = bass;
    s.prevKick = kick;
    s.prevSub = sub;

    const now = performance.now();
    const dt = s.prevFrameAt > 0 ? Math.min(0.08, (now - s.prevFrameAt) / 1000) : 1 / 30;
    s.prevFrameAt = now;

    const fast = 1 - Math.exp(-dt * 16);
    const slow = 1 - Math.exp(-dt * 1.6);
    s.kickEnv += (kick - s.kickEnv) * fast;
    s.subEnv += (sub - s.subEnv) * fast;
    s.fluxAvg += (flux - s.fluxAvg) * slow;
    s.bassAvg += (bass - s.bassAvg) * slow;

    const onset =
      Math.max(0, kickJump) * 3.0 +
      Math.max(0, bassJump) * 1.55 +
      Math.max(0, kick - s.kickEnv) * 2.25 +
      Math.max(0, flux - s.fluxAvg) * 0.62;
    const kickOnset =
      Math.max(0, kickJump) * 3.7 +
      Math.max(0, subJump) * 2.3 +
      Math.max(0, punch - s.kickEnv) * 1.15 +
      Math.max(0, kickFlux - s.kickOnsetAvg) * 1.35;

    const since = now - s.lastBeat;
    const onsetStats = readStats(onsetHistory.values, onsetHistory.count, s.onsetAvg, s.onsetDev);
    const kickStats = readStats(kickHistory.values, kickHistory.count, s.kickOnsetAvg, s.kickOnsetDev);
    const threshold = Math.max(0.012, onsetStats.mean + onsetStats.dev * 0.95);
    const kickThreshold = Math.max(0.008, kickStats.mean + kickStats.dev * 0.58);
    const lowEnergy = bass * 0.38 + kick * 0.5 + sub * 0.12;
    const energyGate = kick > s.kickEnv * 1.018 || lowEnergy > s.bassAvg * 1.018 || kickJump > 0.004;
    const rising = onset >= s.prevOnset * 0.92 || kickJump > 0.005 || bassJump > 0.005;
    const kickGate = kick > s.kickEnv * 1.01 || sub > s.subEnv * 1.012 || kickJump > 0.003 || subJump > 0.003;
    const kickRising = kickOnset >= s.prevKickOnset * 0.82 || kickJump > 0.003 || subJump > 0.003;
    let hit = 0;

    if (since > BEAT_REFRACTORY_MS && kickGate && kickRising && kickOnset > kickThreshold) {
      const strength = (kickOnset - kickThreshold) / Math.max(0.014, kickThreshold);
      hit = clamp01(0.52 + strength * 0.36 + Math.max(0, lowEnergy - s.bassAvg) * 1.25);
      s.lastBeat = now;
    } else if (since > BEAT_REFRACTORY_MS && energyGate && rising && onset > threshold) {
      const strength = (onset - threshold) / Math.max(0.02, threshold);
      hit = clamp01(0.42 + strength * 0.28 + Math.max(0, lowEnergy - s.bassAvg) * 1.0);
      s.lastBeat = now;
    }

    pushHistory(onsetHistory, onset);
    pushHistory(kickHistory, kickOnset);
    s.onsetAvg += (onset - s.onsetAvg) * 0.035;
    s.onsetDev += (Math.abs(onset - s.onsetAvg) - s.onsetDev) * 0.06;
    s.kickOnsetAvg += (kickOnset - s.kickOnsetAvg) * 0.045;
    s.kickOnsetDev += (Math.abs(kickOnset - s.kickOnsetAvg) - s.kickOnsetDev) * 0.07;
    s.prevOnset = onset;
    s.prevKickOnset = kickOnset;

    if (hit > s.pulse) s.pulse = hit;
    s.beat += (hit - s.beat) * (hit > s.beat ? 0.7 : 0.22);
    s.bass = bass;
    s.mid = mid;

    const rhythmRaw = lowEnergy * 0.72 + lowMid * 0.1 + vocal * 0.08 + flux * 0.05 + hit * 0.28;
    s.rhythm += (rhythmRaw - s.rhythm) * (rhythmRaw > s.rhythm ? 0.42 : 0.13);
    s.energy = clamp01(lowEnergy * 0.58 + lowMid * 0.14 + mid * 0.05 + s.rhythm * 0.26);
  }, []);

  const processNative = useCallback((features: VibeFeatures) => {
    const s = stateRef.current;
    s.lastNativeAt = performance.now();
    s.pulse = Math.max(s.pulse, features.pulse || 0);
    s.beat = features.beat || 0;
    s.bass = features.bass || 0;
    s.mid = features.mid || 0;
    s.rhythm = features.rhythm || 0;
    s.energy = features.energy || 0;
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<number[]>('audio:fft', (event) => {
      const bins = event.payload;
      if (!bins?.length || !usePlayerStore.getState().isPlaying) return;
      processFft(bins);
    });
    const unlistenVibePromise = listen<VibeFeatures>('audio:vibe', (event) => {
      if (!usePlayerStore.getState().isPlaying) return;
      processNative(event.payload);
    });

    let raf = 0;
    let lastDecayAt = performance.now();
    const decay = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastDecayAt) / 1000);
      lastDecayAt = now;
      const s = stateRef.current;
      if (usePlayerStore.getState().isPlaying) {
        s.pulse *= Math.exp(-dt * PULSE_RELEASE_PER_SEC);
        if (s.pulse < 0.02) s.pulse = 0;
      } else {
        s.pulse = 0;
        s.prevBass = 0;
        s.prevKick = 0;
        s.prevSub = 0;
        s.prevOnset = 0;
        s.prevKickOnset = 0;
        s.prevFrameAt = 0;
        s.lastBeat = 0;
        onsetHistoryRef.current.values.fill(0);
        onsetHistoryRef.current.index = 0;
        onsetHistoryRef.current.count = 0;
        kickHistoryRef.current.values.fill(0);
        kickHistoryRef.current.index = 0;
        kickHistoryRef.current.count = 0;
      }
      raf = requestAnimationFrame(decay);
    };
    raf = requestAnimationFrame(decay);

    return () => {
      cancelAnimationFrame(raf);
      unlistenPromise.then((u) => u());
      unlistenVibePromise.then((u) => u());
    };
  }, [processFft, processNative]);

  const getBeat = useCallback(() => stateRef.current, []);

  return { getBeat };
}
