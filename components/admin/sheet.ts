'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** Short tick on supporting devices (Android). Silent elsewhere. */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

/**
 * Swipe-down-to-dismiss for a bottom sheet. Dragging starts only on the grab handle so the sheet content keeps scrolling.
 * A fast flick closes it even if it was dragged a short way. Dragging up is damped, never rejected.
 */
export function useSheetDrag(panel: RefObject<HTMLElement | null>, handle: RefObject<HTMLElement | null>, onClose: () => void, enabled = true) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const p = panel.current;
    const h = handle.current;
    if (!enabled || !p || !h) return;
    let y0 = 0;
    let t0 = 0;
    let dy = 0;
    let id = -1;
    const down = (e: PointerEvent) => {
      if (id !== -1) return;
      id = e.pointerId;
      y0 = e.clientY;
      t0 = performance.now();
      dy = 0;
      h.setPointerCapture(id);
      p.style.transition = 'none';
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const raw = e.clientY - y0;
      dy = raw < 0 ? raw / (1 + Math.abs(raw) / 60) : raw;
      p.style.transform = `translateY(${dy}px)`;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      const velocity = dy / Math.max(1, performance.now() - t0);
      const far = dy > Math.min(160, p.offsetHeight * 0.3);
      p.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)';
      if (far || velocity > 0.55) {
        p.style.transform = 'translateY(105%)';
        haptic(8);
        setTimeout(() => close.current(), 200);
      } else {
        p.style.transform = '';
      }
    };
    h.addEventListener('pointerdown', down);
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
    return () => {
      h.removeEventListener('pointerdown', down);
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up);
      h.removeEventListener('pointercancel', up);
    };
  }, [panel, handle, enabled]);
}
