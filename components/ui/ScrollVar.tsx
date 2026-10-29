'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

type Props = {
  as?: ElementType;
  mode?: 'pin' | 'center';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [key: string]: unknown;
};

/**
 * Writes --p (0..1) on its own element as the visitor scrolls through it.
 * "pin": progress through a tall section whose child is position:sticky.
 * "center": progress of the section crossing the viewport centre.
 * One passive listener, one rAF per frame, and only while the element is near the viewport.
 */
export function ScrollVar({ as: Tag = 'div', mode = 'center', className, style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let near = true;
    let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      const p = mode === 'pin' ? -r.top / Math.max(1, r.height - vh) : (vh * 0.5 - r.top) / Math.max(1, r.height);
      const v = Math.round(Math.min(1, Math.max(0, p)) * 1000) / 1000;
      if (v !== last) {
        last = v;
        el.style.setProperty('--p', String(v));
      }
    };
    const onScroll = () => {
      if (near && !raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        if (near) onScroll();
      },
      { rootMargin: '25% 0px' },
    );
    io.observe(el);
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  return (
    <Tag ref={ref} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
