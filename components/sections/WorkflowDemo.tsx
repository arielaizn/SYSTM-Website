'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { scenarios } from '../../lib/content';
import { Pause, Play } from '../ui/Icons';

/**
 * Interactive illustration of one automated process. It is labelled as an illustration, not a client story.
 * Auto-advances while visible; visitors can pause, pick a scenario or jump to any step. Respects motion-off.
 */
export function WorkflowDemo() {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const sc = scenarios[tab];
  const n = sc.steps.length;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const motionOff = () => document.documentElement.classList.contains('motion-off');

  useEffect(() => {
    if (!playing || !visible || hover || motionOff()) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % n), 1900);
    return () => clearInterval(id);
  }, [playing, visible, hover, n, tab]);

  const pick = useCallback((i: number) => {
    setTab(i);
    setStep(0);
  }, []);

  const cur = sc.steps[step];
  const pct = n > 1 ? (step / (n - 1)) * 100 : 0;

  return (
    <div className="demo lg lg--dense" data-reveal="" ref={root} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <div className="demo__top">
        <div className="demo__tabs" role="tablist" aria-label="תרחיש להמחשה">
          {scenarios.map((s, i) => (
            <button key={s.id} role="tab" type="button" aria-selected={i === tab} className="demo__tab" onClick={() => pick(i)}>
              {s.tab}
            </button>
          ))}
        </div>
        <button type="button" className="demo__play" aria-pressed={!playing} aria-label={playing ? 'עצירת ההמחשה' : 'הפעלת ההמחשה'} onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause /> : <Play />}
        </button>
      </div>

      <p className="demo__trigger">
        <span className="dot" /> מתחיל כש: {sc.trigger}
      </p>

      <ol className="demo__flow" style={{ '--n': n, '--pct': `${pct}%` } as CSSProperties}>
        <li className="demo__rail" aria-hidden="true">
          <span className="demo__fill" />
          <span className="demo__token" />
        </li>
        {sc.steps.map((s, i) => (
          <li key={s.label} className={`demo__step${s.gate ? ' is-gate' : ''}`} data-state={i < step ? 'done' : i === step ? 'active' : 'idle'}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
              <span className="demo__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="demo__label">{s.label}</span>
              {s.gate ? <span className="demo__tag">אישור אנושי</span> : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="demo__detail" aria-live="polite">
        <b>{cur.label}</b>
        <span>{cur.detail}</span>
      </div>

      <p className="demo__note">המחשה בלבד. התהליך בפועל נקבע אחרי מיפוי והרשאות.</p>
    </div>
  );
}
