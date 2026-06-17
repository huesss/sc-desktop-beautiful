export function hexLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function isLightBg(hex: string): boolean {
  return hexLuminance(hex) > 160;
}
