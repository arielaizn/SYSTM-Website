'use client';

import { useEffect, useRef } from 'react';
import { MONOGRAM_PATH } from '../brand/logo-data';
import { rv } from '../../lib/reveal';
import { Btn } from '../ui/Btn';

/**
 * Typographic brand card in place of a portrait (no approved photo was supplied, docs/10-11).
 * Tilts toward the pointer with a lerped spring; the specular rim and glare come from the shared .lg light.
 */
function TiltCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    const t = { x: 0, y: 0 };
    const c = { x: 0, y: 0 };
    const loop = () => {
      c.x += (t.x - c.x) * 0.12;
      c.y += (t.y - c.y) * 0.12;
      el.style.transform = `perspective(1000px) rotateX(${(-c.y * 7).toFixed(2)}deg) rotateY(${(c.x * 9).toFixed(2)}deg)`;
      if (Math.abs(t.x - c.x) + Math.abs(t.y - c.y) > 0.002) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = () => {
      if (!raf && !document.documentElement.classList.contains('motion-off')) raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      t.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      t.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const leave = () => {
      t.x = 0;
      t.y = 0;
      kick();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="founder__card lg lg--ice" ref={ref} data-reveal="" data-refract="30" aria-hidden="true">
      <svg className="founder__mono" viewBox="0 0 295 58" focusable="false">
        <path d={MONOGRAM_PATH} />
      </svg>
      <p className="founder__big">
        MAKE
        <br />
        IT
        <br />
        <em>WORK.</em>
      </p>
      <p className="founder__foot">SYSTM / ARIEL EISENSTATT</p>
    </div>
  );
}

export function Founder() {
  return (
    <section className="section founder container" data-stage="founder">
      <div className="founder__copy">
        <p className="eyebrow" {...rv(0)}>
          <span className="dot" />
          <bdi>05</bdi> / נעים להכיר
        </p>
        <h2 className="h-lg" {...rv(1)}>
          אריאל איזנשטט.
          <br />
          <em>מעניין אותו שזה יעבוד.</em>
        </h2>
        <p className="founder__lead" {...rv(2)}>
          יזם, יוצר תוכן ומרצה ל־AI. מחבר בין חשיבה יצירתית, כלים חדשים וביצוע מעשי.
        </p>
        <p className="muted" {...rv(3)}>
          מלמד טכנולוגיה בשפה פשוטה, ובונה תהליכים וכלים שיוצאים מצורך אמיתי בעסק.
        </p>
        <Btn href="/about/" variant="glass" delay={200}>
          קצת עליי
        </Btn>
      </div>
      <TiltCard />
    </section>
  );
}
