import { useAuthStore } from '../stores/auth';
import { api } from './api';

export type SoundWaveEvent =
  | 'like'
  | 'local_like'
  | 'playlist_add'
  | 'full_play'
  | 'skip'
  | 'dislike';






export function recordEvent(
  eventType: SoundWaveEvent,
  scTrackId: string,
  positionPct?: number,
): void {
  if (!scTrackId) return;
  const scUserId = useAuthStore.getState().user?.urn;
  if (!scUserId) return;

  const body: Record<string, unknown> = { scUserId, scTrackId, eventType };
  if (positionPct != null && Number.isFinite(positionPct)) {
    body.positionPct = Math.max(0, Math.min(1, positionPct));
  }

  api('/events', {
    method: 'POST',
    body: JSON.stringify(body),
  }).catch(() => {});
}
