const UUID_HYPHEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_COMPACT_RE = /^[0-9a-f]{32}$/i;

export function normalizeSessionId(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;

  if (UUID_HYPHEN_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const compact = trimmed.replace(/-/g, '');
  if (!UUID_COMPACT_RE.test(compact)) return null;

  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join('-');
}

export function isValidSessionId(value: string | null | undefined): value is string {
  return normalizeSessionId(value) !== null;
}

export function isMalformedSessionBody(status: number, body: string): boolean {
  if (status !== 401) return false;
  const b = body.toLowerCase();
  return (
    b.includes('malformed session') ||
    b.includes('missing or malformed') ||
    b.includes('missing or invalid')
  );
}
