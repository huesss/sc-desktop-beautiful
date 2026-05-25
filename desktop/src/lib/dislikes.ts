import { apiRequest } from './api-client';

export async function clearAllDislikes(): Promise<void> {
  try {
    await apiRequest('/dislikes', { method: 'DELETE' }, undefined, { silent: true });
  } catch {
    
  }
}
