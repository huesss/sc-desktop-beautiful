import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fc } from '../../lib/formatters';
import type { Aura } from '../../lib/aura';

export type TabId = 'popular' | 'tracks' | 'playlists' | 'likes' | 'followers' | 'following';

export interface TabDescriptor<T extends string = string> {
  id: T;
  label: string;
  count?: number | null;
}

interface TabDockProps<T extends string = string> {
  tabs: ReadonlyArray<TabDescriptor<T>>;
  active: T;
  onChange: (id: T) => void;
  aura: Aura;
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function TabDockImpl<T extends string>({ tabs, active, onChange }: TabDockProps<T>) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [overflows, setOverflows] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  useIsoLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const btn = dock.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
    if (!btn) return;

    const update = () => {
      const dockRect = dock.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      setPill({ x: r.left - dockRect.left + dock.scrollLeft, w: r.width });
      setOverflows(dock.scrollWidth > dock.clientWidth + 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(dock);
    ro.observe(btn);
    return () => ro.disconnect();
  }, [active, tabs]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const dock = dockRef.current;
    if (!dock || dock.scrollWidth <= dock.clientWidth + 1) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: dock.scrollLeft,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dock = dockRef.current;
    if (!dock) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      dock.setPointerCapture(e.pointerId);
      dock.style.cursor = 'grabbing';
    }
    if (drag.moved) {
      dock.scrollLeft = drag.startScroll - dx;
    }
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    drag.moved = false;
    const dock = dockRef.current;
    if (!dock) return;
    if (dock.hasPointerCapture(e.pointerId)) dock.releasePointerCapture(e.pointerId);
    dock.style.cursor = '';
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const dock = dockRef.current;
    if (!dock) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    dock.scrollLeft += e.deltaY;
  }, []);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isHovered) return;
      if (dock.scrollWidth <= dock.clientWidth + 1) return;

      if (e.key === 'PageUp') {
        dock.scrollBy({ left: -dock.clientWidth * 0.8, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.key === 'PageDown') {
        dock.scrollBy({ left: dock.clientWidth * 0.8, behavior: 'smooth' });
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isHovered]);

  return (
    <div className="sticky top-3 z-40 flex justify-center pointer-events-none px-2 sm:px-4">
      <div
        ref={dockRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onWheel={onWheel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`pointer-events-auto relative flex max-w-full min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg border border-white/10 bg-[#141414] p-1 touch-pan-x select-none sm:gap-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] ${
          overflows ? 'cursor-grab' : 'cursor-default'
        }`}
      >
        {pill && (
          <div
            className="absolute top-1 bottom-1 rounded-md bg-accent transition-all duration-300 ease-out sm:top-1 sm:bottom-1"
            style={{ left: pill.x, width: pill.w }}
          />
        )}
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative z-10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition-colors sm:h-9 sm:gap-2 sm:px-3.5 md:px-4 ${
                overflows ? 'cursor-grab' : 'cursor-pointer'
              } ${isActive ? 'text-white' : 'text-[#ffffff99] hover:text-white'}`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count != null && (
                <span
                  className={`hidden rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums sm:inline-flex ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-[#ffffff99]'
                  }`}
                >
                  {fc(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const TabDock = React.memo(TabDockImpl) as typeof TabDockImpl;
