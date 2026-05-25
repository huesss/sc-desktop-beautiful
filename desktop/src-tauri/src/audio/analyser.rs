

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use rodio::source::SeekError;
use rodio::Source;
use rustfft::num_complex::Complex;
use rustfft::FftPlanner;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::audio::types::{ChannelCount, SampleRate};

const FFT_SIZE: usize = 1024;
const RING_CAPACITY: usize = 4096;
const FFT_INTERVAL_MS: u64 = 16;
pub const NUM_BINS: usize = 64;
const MIN_FREQ_HZ: f32 = 50.0;
const ONSET_HISTORY: usize = 32;
const KICK_HISTORY: usize = 20;
const BEAT_REFRACTORY_MS: u128 = 82;

#[derive(Clone, Serialize)]
struct VibeFeatures {
    pulse: f32,
    beat: f32,
    kick: f32,
    bass: f32,
    sub: f32,
    mid: f32,
    vocal: f32,
    rhythm: f32,
    energy: f32,
}

struct RingStats<const N: usize> {
    values: [f32; N],
    index: usize,
    count: usize,
}

impl<const N: usize> RingStats<N> {
    fn new() -> Self {
        Self {
            values: [0.0; N],
            index: 0,
            count: 0,
        }
    }

    fn push(&mut self, value: f32) {
        self.values[self.index] = value;
        self.index = (self.index + 1) % N;
        self.count = self.count.saturating_add(1).min(N);
    }

    fn stats(&self, fallback_mean: f32, fallback_dev: f32) -> (f32, f32) {
        if self.count <= 4 {
            return (fallback_mean, fallback_dev);
        }
        let mut mean = 0.0;
        for i in 0..self.count {
            mean += self.values[i];
        }
        mean /= self.count as f32;
        let mut variance = 0.0;
        for i in 0..self.count {
            let d = self.values[i] - mean;
            variance += d * d;
        }
        (mean, (variance / self.count as f32).sqrt())
    }
}

struct VibeDetector {
    prev_bins: [f32; NUM_BINS],
    prev_mags: [f32; FFT_SIZE / 2],
    onset_history: RingStats<ONSET_HISTORY>,
    kick_history: RingStats<KICK_HISTORY>,
    onset_avg: f32,
    onset_dev: f32,
    kick_avg: f32,
    kick_dev: f32,
    kick_env: f32,
    sub_env: f32,
    bass_avg: f32,
    prev_kick: f32,
    prev_bass: f32,
    prev_sub: f32,
    prev_vocal: f32,
    prev_onset: f32,
    prev2_onset: f32,
    prev_kick_onset: f32,
    prev2_kick_onset: f32,
    prev_kick_gate: bool,
    prev_low_energy: f32,
    last_beat: Option<Instant>,
    pulse: f32,
    beat: f32,
    rhythm: f32,
    energy: f32,
    last_frame: Instant,
}

impl VibeDetector {
    fn new() -> Self {
        Self {
            prev_bins: [0.0; NUM_BINS],
            prev_mags: [0.0; FFT_SIZE / 2],
            onset_history: RingStats::new(),
            kick_history: RingStats::new(),
            onset_avg: 0.03,
            onset_dev: 0.02,
            kick_avg: 0.02,
            kick_dev: 0.015,
            kick_env: 0.08,
            sub_env: 0.08,
            bass_avg: 0.12,
            prev_kick: 0.0,
            prev_bass: 0.0,
            prev_sub: 0.0,
            prev_vocal: 0.0,
            prev_onset: 0.0,
            prev2_onset: 0.0,
            prev_kick_onset: 0.0,
            prev2_kick_onset: 0.0,
            prev_kick_gate: false,
            prev_low_energy: 0.0,
            last_beat: None,
            pulse: 0.0,
            beat: 0.0,
            rhythm: 0.0,
            energy: 0.0,
            last_frame: Instant::now(),
        }
    }

    fn process(
        &mut self,
        bins: &[f32; NUM_BINS],
        mags: &[f32; FFT_SIZE / 2],
        sample_rate: f32,
    ) -> VibeFeatures {
        let now = Instant::now();
        let dt = now
            .duration_since(self.last_frame)
            .as_secs_f32()
            .clamp(0.001, 0.08);
        self.last_frame = now;

        let sub = freq_avg(mags, sample_rate, 25.0, 70.0, 1.1);
        let kick = freq_avg(mags, sample_rate, 35.0, 150.0, 0.9) * 0.58
            + freq_peak(mags, sample_rate, 35.0, 150.0) * 0.42;
        let bass = freq_avg(mags, sample_rate, 55.0, 250.0, 0.75);
        let punch = freq_avg(mags, sample_rate, 90.0, 220.0, 0.45);
        let low_mid = freq_avg(mags, sample_rate, 250.0, 650.0, 0.2);
        let mid = freq_avg(mags, sample_rate, 500.0, 2500.0, 0.0);
        let vocal = freq_avg(mags, sample_rate, 300.0, 3500.0, 0.0);

        let kick_jump = kick - self.prev_kick;
        let bass_jump = bass - self.prev_bass;
        let sub_jump = sub - self.prev_sub;
        let vocal_jump = vocal - self.prev_vocal;
        self.prev_kick = kick;
        self.prev_bass = bass;
        self.prev_sub = sub;
        self.prev_vocal = vocal;

        let mut flux = 0.0;
        let mut kick_flux = 0.0;
        let mut flux_count = 0.0;
        let mut kick_flux_count = 0.0;
        for i in 1..mags.len() {
            let freq = bin_freq(i, sample_rate);
            let d = mags[i] - self.prev_mags[i];
            if d > 0.0 {
                if (35.0..=180.0).contains(&freq) {
                    kick_flux += d * if freq < 90.0 { 1.9 } else { 1.15 };
                    kick_flux_count += 1.0;
                }
                if (35.0..=900.0).contains(&freq) {
                    flux += d * if freq < 180.0 { 1.35 } else { 0.55 };
                    flux_count += 1.0;
                }
            }
            self.prev_mags[i] = mags[i];
        }
        for i in 1..26.min(NUM_BINS) {
            self.prev_bins[i] = bins[i];
        }
        for i in 26.min(NUM_BINS)..NUM_BINS {
            self.prev_bins[i] = bins[i];
        }
        flux /= f32::max(1.0, flux_count);
        kick_flux /= f32::max(1.0, kick_flux_count);

        let fast = 1.0 - (-dt * 18.0).exp();
        let slow = 1.0 - (-dt * 1.5).exp();
        self.kick_env += (kick - self.kick_env) * fast;
        self.sub_env += (sub - self.sub_env) * fast;
        self.bass_avg += (bass - self.bass_avg) * slow;

        let onset = (kick_jump.max(0.0) * 3.0)
            + (bass_jump.max(0.0) * 1.4)
            + ((kick - self.kick_env).max(0.0) * 2.1)
            + (flux.max(0.0) * 0.55);
        let kick_onset = (kick_jump.max(0.0) * 4.0)
            + (sub_jump.max(0.0) * 2.5)
            + ((punch - self.kick_env).max(0.0) * 1.1)
            + ((kick_flux - self.kick_avg).max(0.0) * 1.45);

        let (onset_mean, onset_dev) = self.onset_history.stats(self.onset_avg, self.onset_dev);
        let (kick_mean, kick_dev) = self.kick_history.stats(self.kick_avg, self.kick_dev);
        let onset_threshold = (onset_mean + onset_dev * 1.35).max(0.018);
        let kick_threshold = (kick_mean + kick_dev * 0.36).max(0.0048);
        let low_energy = bass * 0.36 + kick * 0.52 + sub * 0.12;
        let since = self
            .last_beat
            .map(|t| now.duration_since(t).as_millis())
            .unwrap_or(u128::MAX);

        let kick_gate = kick > self.kick_env * 1.008
            || sub > self.sub_env * 1.01
            || kick_jump > 0.0018
            || sub_jump > 0.0018;
        let kick_rising =
            kick_onset >= self.prev_kick_onset * 0.72 || kick_jump > 0.0018 || sub_jump > 0.0018;
        let vocal_veto = vocal_jump > (kick_jump.max(sub_jump) * 2.4 + 0.002)
            && vocal > low_energy * 1.15
            && kick_onset < kick_threshold * 2.7;
        let onset_gate = false;
        let onset_peak =
            self.prev_onset > self.prev2_onset * 1.02 && self.prev_onset >= onset * 0.98;
        let kick_peak = self.prev_kick_onset > self.prev2_kick_onset * 1.03
            && self.prev_kick_onset >= kick_onset * 0.96;
        let kick_now_strong = kick_gate && kick_onset > kick_threshold * 2.2;

        let mut hit = 0.0;
        if since > BEAT_REFRACTORY_MS
            && !vocal_veto
            && ((self.prev_kick_gate && kick_peak && self.prev_kick_onset > kick_threshold)
                || kick_now_strong)
        {
            let picked = if kick_now_strong {
                kick_onset
            } else {
                self.prev_kick_onset
            };
            let picked_energy = if kick_now_strong {
                low_energy
            } else {
                self.prev_low_energy
            };
            let strength = (picked - kick_threshold) / kick_threshold.max(0.012);
            hit = (0.55 + strength * 0.34 + (picked_energy - self.bass_avg).max(0.0) * 1.25)
                .clamp(0.0, 1.0);
            self.last_beat = Some(now);
        } else if since > BEAT_REFRACTORY_MS
            && onset_gate
            && onset_peak
            && self.prev_onset > onset_threshold
        {
            let strength = (self.prev_onset - onset_threshold) / onset_threshold.max(0.018);
            hit = (0.28 + strength * 0.18 + (self.prev_low_energy - self.bass_avg).max(0.0) * 0.75)
                .clamp(0.0, 0.72);
            self.last_beat = Some(now);
        }

        self.onset_history.push(onset);
        self.kick_history.push(kick_onset);
        self.onset_avg += (onset - self.onset_avg) * 0.03;
        self.onset_dev += ((onset - self.onset_avg).abs() - self.onset_dev) * 0.055;
        self.kick_avg += (kick_onset - self.kick_avg) * 0.04;
        self.kick_dev += ((kick_onset - self.kick_avg).abs() - self.kick_dev) * 0.065;
        self.prev2_onset = self.prev_onset;
        self.prev_onset = onset;
        self.prev2_kick_onset = self.prev_kick_onset;
        self.prev_kick_onset = kick_onset;
        self.prev_kick_gate = kick_gate && kick_rising;
        self.prev_low_energy = low_energy;

        self.pulse *= (-dt * 11.0).exp();
        if hit > self.pulse {
            self.pulse = hit;
        }
        self.beat += (hit - self.beat) * if hit > self.beat { 0.72 } else { 0.2 };
        let rhythm_raw = low_energy * 0.7 + low_mid * 0.1 + vocal * 0.08 + flux * 0.05 + hit * 0.3;
        self.rhythm +=
            (rhythm_raw - self.rhythm) * if rhythm_raw > self.rhythm { 0.44 } else { 0.12 };
        self.energy =
            (low_energy * 0.58 + low_mid * 0.14 + mid * 0.05 + self.rhythm * 0.26).clamp(0.0, 1.0);

        VibeFeatures {
            pulse: self.pulse,
            beat: self.beat,
            kick,
            bass,
            sub,
            mid,
            vocal,
            rhythm: self.rhythm,
            energy: self.energy,
        }
    }

    fn silence(&mut self) -> VibeFeatures {
        self.pulse = 0.0;
        self.beat = 0.0;
        self.rhythm *= 0.9;
        self.energy *= 0.9;
        VibeFeatures {
            pulse: 0.0,
            beat: 0.0,
            kick: 0.0,
            bass: 0.0,
            sub: 0.0,
            mid: 0.0,
            vocal: 0.0,
            rhythm: self.rhythm,
            energy: self.energy,
        }
    }
}

fn bin_freq(index: usize, sample_rate: f32) -> f32 {
    index as f32 * sample_rate / FFT_SIZE as f32
}

fn compressed_mag(mag: f32) -> f32 {
    let v = (mag / 32.0).min(1.0);
    (1.0 + v * 9.0).ln() / 10.0_f32.ln()
}

fn freq_avg(
    mags: &[f32; FFT_SIZE / 2],
    sample_rate: f32,
    from_hz: f32,
    to_hz: f32,
    weight: f32,
) -> f32 {
    let mut sum = 0.0;
    let mut weight_sum = 0.0;
    let span = (to_hz - from_hz).max(1.0);
    for (i, mag) in mags.iter().enumerate().skip(1) {
        let freq = bin_freq(i, sample_rate);
        if freq < from_hz || freq > to_hz {
            continue;
        }
        let pos = ((freq - from_hz) / span).clamp(0.0, 1.0);
        let w = 1.0 + weight * (1.0 - pos);
        sum += *mag * w;
        weight_sum += w;
    }
    sum / weight_sum.max(1.0)
}

fn freq_peak(mags: &[f32; FFT_SIZE / 2], sample_rate: f32, from_hz: f32, to_hz: f32) -> f32 {
    let mut peak = 0.0;
    for (i, mag) in mags.iter().enumerate().skip(1) {
        let freq = bin_freq(i, sample_rate);
        if freq >= from_hz && freq <= to_hz && *mag > peak {
            peak = *mag;
        }
    }
    peak
}

pub struct AnalyserBuffer {
    samples: Mutex<VecDeque<f32>>,
    pub sample_rate: AtomicU32,
    pub running: AtomicBool,
}

impl AnalyserBuffer {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            samples: Mutex::new(VecDeque::with_capacity(RING_CAPACITY)),
            sample_rate: AtomicU32::new(44_100),
            running: AtomicBool::new(true),
        })
    }
}

pub struct AnalyserSource<S: Source<Item = f32>> {
    source: S,
    buffer: Arc<AnalyserBuffer>,
    channels: ChannelCount,
    sample_rate: SampleRate,
    cur_channel: u16,
    accum: f32,
}

impl<S: Source<Item = f32>> AnalyserSource<S> {
    pub fn new(source: S, buffer: Arc<AnalyserBuffer>) -> Self {
        let channels = source.channels();
        let sample_rate = source.sample_rate();
        buffer
            .sample_rate
            .store(sample_rate.get() as u32, Ordering::Relaxed);
        Self {
            source,
            buffer,
            channels,
            sample_rate,
            cur_channel: 0,
            accum: 0.0,
        }
    }
}

impl<S: Source<Item = f32>> Iterator for AnalyserSource<S> {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        let sample = self.source.next()?;
        self.accum += sample;
        self.cur_channel += 1;

        if self.cur_channel >= self.channels.get() {
            let mono = self.accum / self.channels.get() as f32;
            self.cur_channel = 0;
            self.accum = 0.0;

            if let Ok(mut q) = self.buffer.samples.try_lock() {
                if q.len() >= RING_CAPACITY {
                    let drop_n = q.len() - RING_CAPACITY + 1;
                    q.drain(0..drop_n);
                }
                q.push_back(mono);
            }
        }
        Some(sample)
    }
}

impl<S: Source<Item = f32>> Source for AnalyserSource<S> {
    fn current_span_len(&self) -> Option<usize> {
        self.source.current_span_len()
    }
    fn channels(&self) -> ChannelCount {
        self.channels
    }
    fn sample_rate(&self) -> SampleRate {
        self.sample_rate
    }
    fn total_duration(&self) -> Option<Duration> {
        self.source.total_duration()
    }
    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.source.try_seek(pos)
    }
}

pub fn start_fft_thread(app: AppHandle, buffer: Arc<AnalyserBuffer>) {
    std::thread::Builder::new()
        .name("audio-fft".into())
        .spawn(move || run_fft_loop(app, buffer))
        .expect("failed to spawn audio-fft thread");
}

fn run_fft_loop(app: AppHandle, buffer: Arc<AnalyserBuffer>) {
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);

    let mut window = vec![0.0f32; FFT_SIZE];
    for i in 0..FFT_SIZE {
        window[i] =
            0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / (FFT_SIZE - 1) as f32).cos());
    }

    let mut fft_buf = vec![Complex::new(0.0f32, 0.0); FFT_SIZE];
    let mut bins_smooth = vec![0.0f32; NUM_BINS];
    let mut vibe_detector = VibeDetector::new();
    let mut silence_skips: u32 = 0;
    let mut prev_emit_was_silent = true;

    loop {
        std::thread::sleep(Duration::from_millis(FFT_INTERVAL_MS));
        if !buffer.running.load(Ordering::Relaxed) {
            break;
        }

        let snapshot: Option<Vec<f32>> = {
            let q = buffer.samples.lock().unwrap();
            if q.len() < FFT_SIZE {
                None
            } else {
                let start = q.len() - FFT_SIZE;
                Some(q.iter().skip(start).copied().collect())
            }
        };

        let Some(samples) = snapshot else {

            silence_skips = silence_skips.saturating_add(1);
            if !prev_emit_was_silent && silence_skips >= 4 {
                let zeros = vec![0.0f32; NUM_BINS];
                let _ = app.emit("audio:fft", &zeros);
                let _ = app.emit("audio:vibe", &vibe_detector.silence());
                prev_emit_was_silent = true;
            }
            continue;
        };

        let mut peak = 0.0f32;
        for &s in &samples {
            let a = s.abs();
            if a > peak {
                peak = a;
            }
        }
        if peak < 1e-4 {
            silence_skips = silence_skips.saturating_add(1);
            if !prev_emit_was_silent {
                let zeros = vec![0.0f32; NUM_BINS];
                let _ = app.emit("audio:fft", &zeros);
                let _ = app.emit("audio:vibe", &vibe_detector.silence());
                prev_emit_was_silent = true;
            }
            continue;
        }
        silence_skips = 0;

        for i in 0..FFT_SIZE {
            fft_buf[i] = Complex::new(samples[i] * window[i], 0.0);
        }
        fft.process(&mut fft_buf);

        let sample_rate = buffer.sample_rate.load(Ordering::Relaxed) as f32;
        let nyquist = (sample_rate * 0.5).max(1.0);
        let mag_count = FFT_SIZE / 2;

        let log_min = MIN_FREQ_HZ.ln();
        let log_max = nyquist.ln();
        let log_range = (log_max - log_min).max(1e-3);

        let mut raw_bins = [0.0f32; NUM_BINS];
        let mut mags = [0.0f32; FFT_SIZE / 2];
        let nbins = NUM_BINS as f32;
        for (i, c) in fft_buf.iter().take(mag_count).enumerate() {
            let freq = (i as f32) * nyquist / (mag_count as f32);
            let mag = (c.re * c.re + c.im * c.im).sqrt();
            mags[i] = compressed_mag(mag);
            if freq < MIN_FREQ_HZ {
                continue;
            }
            let log_freq = freq.ln();
            let pos = ((log_freq - log_min) / log_range).clamp(0.0, 0.999);
            let idx = (pos * nbins) as usize;
            if mag > raw_bins[idx] {
                raw_bins[idx] = mag;
            }
        }

        let inv_log9 = 1.0 / 10.0_f32.ln();
        let mut bins = vec![0.0f32; NUM_BINS];
        for i in 0..NUM_BINS {
            let v = (raw_bins[i] / 32.0).min(1.0);
            let log_v = (1.0 + v * 9.0).ln() * inv_log9;
            raw_bins[i] = log_v;
            bins_smooth[i] = bins_smooth[i] * 0.55 + log_v * 0.45;
            bins[i] = bins_smooth[i];
        }

        let vibe = vibe_detector.process(&raw_bins, &mags, sample_rate);
        let _ = app.emit("audio:vibe", &vibe);
        if app.emit("audio:fft", &bins).is_ok() {
            prev_emit_was_silent = false;
        }
    }
}
