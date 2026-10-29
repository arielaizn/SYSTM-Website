'use client';

import { useEffect, useRef } from 'react';
import { stageBus } from '../stage/bus';

const LABELS = [
  { en: 'INPUT', he: 'מה נכנס' },
  { en: 'SYSTEM', he: 'מה מחבר' },
  { en: 'IMPACT', he: 'מה זז קדימה' },
];

/** HUD labels glued to the three slabs. Positions come from the stage every frame; React never re-renders. */
export function HeroCallouts() {
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    // Every style write forces a style recalculation, so only write what actually changed. Off screen (w < 0.01) the
    // loop does nothing at all: it used to rewrite the opacity every frame on every visit to the home page.
    let lastOpacity = '';
    const lastT: string[] = [];
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = root.current;
      if (!el) return;
      const w = stageBus.ready ? Math.pow(stageBus.hero, 2) : 0;
      const op = w < 0.01 ? '0' : w.toFixed(2);
      if (op !== lastOpacity) {
        el.style.opacity = op;
        lastOpacity = op;
      }
      if (w < 0.01) return;
      items.current.forEach((node, i) => {
        if (!node) return;
        const t = `translate3d(${stageBus.anchors[i * 2].toFixed(1)}px, ${stageBus.anchors[i * 2 + 1].toFixed(1)}px, 0)`;
        if (t !== lastT[i]) {
          node.style.transform = t;
          lastT[i] = t;
        }
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="callouts" ref={root} aria-hidden="true">
      {LABELS.map((l, i) => (
        <div className="callout" key={l.en} ref={(n) => void (items.current[i] = n)}>
          <i className="callout__dot" />
          <i className="callout__line" />
          <span className="callout__text">
            <b>{l.en}</b>
            <small>{l.he}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
