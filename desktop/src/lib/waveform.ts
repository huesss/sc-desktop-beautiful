import { useQuery } from '@tanstack/react-query';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { Track } from '../stores/player';

export interface WaveformSamples {
  values: number[];
  height: number;
}

interface ScWaveformJson {
  width: number;
  height: number;
  samples: number[];
}


function normalizeWaveformUrl(raw: string): string | null {
  if (!raw) return null;
  
  
  return raw.replace(/\.png(\?.*)?$/i, '.json$1').replace(/^http:\/\//i, 'https://');
}

async function fetchWaveform(rawUrl: string): Promise<WaveformSamples> {
  const url = normalizeWaveformUrl(rawUrl);
  if (!url) throw new Error('Invalid waveform url');

  const res = await tauriFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`waveform ${res.status}`);
  const json = (await res.json()) as ScWaveformJson;

  if (!Array.isArray(json.samples) || json.samples.length === 0) {
    throw new Error('waveform: empty samples');
  }
  return { values: json.samples, height: json.height || 140 };
}


export function useTrackWaveform(track: Track | null) {
  const rawUrl = track?.waveform_url ?? null;
  return useQuery({
    queryKey: ['waveform', rawUrl],
    enabled: !!rawUrl,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: false,
    queryFn: () => fetchWaveform(rawUrl!),
  });
}
