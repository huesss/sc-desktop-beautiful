import { fetchWithAuthFallback } from './api-client';










export interface CreateLinkResponse {
  linkRequestId: string;
  claimToken: string;
  expiresAt: string;
}

export interface LinkStatusResponse {
  status: 'pending' | 'claimed' | 'failed' | 'expired';
  mode: 'pull' | 'push';
  sessionId?: string;
  error?: string;
}

export interface ClaimLinkResponse {
  sessionId: string;
  mode: 'pull' | 'push';
}

export async function createLinkRequest(mode: 'pull' | 'push'): Promise<CreateLinkResponse> {
  return fetchWithAuthFallback<CreateLinkResponse>('/auth/link/create', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export async function claimLinkRequest(claimToken: string): Promise<ClaimLinkResponse> {
  return fetchWithAuthFallback<ClaimLinkResponse>('/auth/link/claim', {
    method: 'POST',
    body: JSON.stringify({ claimToken }),
  });
}

export async function getLinkStatus(linkRequestId: string): Promise<LinkStatusResponse> {
  return fetchWithAuthFallback<LinkStatusResponse>(
    `/auth/link/status?id=${encodeURIComponent(linkRequestId)}`,
  );
}














export function encodeQrPayload(claimToken: string, mode: 'pull' | 'push'): string {
  const params = new URLSearchParams({ token: claimToken, mode });
  return `scd://link?${params.toString()}`;
}
