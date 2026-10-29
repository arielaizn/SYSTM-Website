'use client';

import { useEffect, useRef } from 'react';

/** Thin ice line under the header showing how far down the article the visitor is. rAF-throttled, transform only. */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => {
      removeEventListener('scroll', on);
      removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="reading" aria-hidden="true"><div ref={bar} /></div>;
}
