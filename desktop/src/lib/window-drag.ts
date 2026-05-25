import { getCurrentWindow } from '@tauri-apps/api/window';
import type { PointerEvent } from 'react';

export function isWindowDragBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return !!target.closest(
    '[data-no-drag], button, input, textarea, select, a, [role="search"], [contenteditable="true"]',
  );
}

export function onTitlebarPointerDown(e: PointerEvent<HTMLElement>) {
  if (e.button !== 0) return;
  if (isWindowDragBlocked(e.target)) return;
  if (e.detail === 2) {
    void getCurrentWindow().toggleMaximize();
    return;
  }
  void getCurrentWindow().startDragging();
}
