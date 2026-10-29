'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type State = 'idle' | 'playing' | 'paused';

const RATES = [1, 1.25, 1.5, 2, 0.85];
const fmtRate = (r: number) => `${String(r).replace(/^0\./, '0.')}×`;

/** Splits a text into short utterances: Chrome cuts long ones off after ~15 seconds, and short ones allow skipping. */
function chunk(paras: string[]): string[] {
  const out: string[] = [];
  for (const p of paras) {
    const sentences = p.match(/[^.!?׃:]+[.!?׃:]?\s*/g) ?? [p];
    let cur = '';
    for (const s of sentences) {
      if ((cur + s).length > 170 && cur) {
        out.push(cur.trim());
        cur = s;
      } else cur += s;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out.filter(Boolean);
}

/**
 * Read-aloud player for a guide, using the visitor's own speech engine (Web Speech API): no server, no cost, works offline.
 * Hebrew quality depends on the device voices; without one the player says so instead of reading Hebrew with an English voice.
 * Pause = stop and remember the position (the native pause/resume is unreliable in Chrome and Safari).
 */
export function GuideReader({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [hasVoice, setHasVoice] = useState(true);
  const [state, setState] = useState<State>('idle');
  const [rate, setRate] = useState(1);
  const [pos, setPos] = useState(0);
  const chunks = useRef<string[]>([]);
  const idx = useRef(0);
  const run = useRef(0);
  const voice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    chunks.current = chunk([title, ...paragraphs]);
  }, [title, paragraphs]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const pick = () => {
      const all = speechSynthesis.getVoices();
      voice.current = all.find((v) => /^he/i.test(v.lang) && v.localService) ?? all.find((v) => /^he/i.test(v.lang)) ?? null;
      setHasVoice(all.length === 0 || !!voice.current);
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', pick);
      speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback(
    (from: number) => {
      speechSynthesis.cancel();
      const id = ++run.current;
      idx.current = from;
      setState('playing');
      const next = () => {
        if (id !== run.current) return;
        if (idx.current >= chunks.current.length) {
          setState('idle');
          idx.current = 0;
          setPos(0);
          return;
        }
        setPos(idx.current);
        const u = new SpeechSynthesisUtterance(chunks.current[idx.current]);
        u.lang = 'he-IL';
        if (voice.current) u.voice = voice.current;
        u.rate = rate;
        u.onend = () => {
          idx.current += 1;
          next();
        };
        u.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          setState('idle');
        };
        speechSynthesis.speak(u);
      };
      next();
    },
    [rate],
  );

  const pause = () => {
    run.current++;
    speechSynthesis.cancel();
    setState('paused');
  };
  const stop = () => {
    run.current++;
    speechSynthesis.cancel();
    idx.current = 0;
    setPos(0);
    setState('idle');
  };
  const jump = (d: number) => {
    const to = Math.min(Math.max(0, idx.current + d), Math.max(0, chunks.current.length - 1));
    if (state === 'playing') speakFrom(to);
    else {
      idx.current = to;
      setPos(to);
    }
  };

  // A new speed applies from the current sentence on.
  useEffect(() => {
    if (state === 'playing') speakFrom(idx.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  if (supported === null) return null;
  if (!supported) return <p className="reader reader--off">הקראה קולית לא נתמכת בדפדפן הזה.</p>;
  const total = chunks.current.length || 1;
  const pct = state === 'idle' ? 0 : Math.round(((pos + 1) / total) * 100);
  // About 900 characters of Hebrew per minute at normal speed.
  const chars = chunks.current.reduce((n, c) => n + c.length, 0);
  const minutes = Math.max(1, Math.round(chars / 900 / rate));
  const cycleRate = () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const f = Math.min(1, Math.max(0, (rtl ? r.right - e.clientX : e.clientX - r.left) / r.width));
    const to = Math.min(total - 1, Math.floor(f * total));
    if (state === 'playing' || state === 'idle') speakFrom(to);
    else {
      idx.current = to;
      setPos(to);
    }
  };
  const barKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') jump(document.dir === 'rtl' ? -1 : 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') jump(document.dir === 'rtl' ? 1 : -1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="reader lg lg--dense" role="group" aria-label="הקראה קולית של המדריך" data-state={state}>
      <button type="button" className="reader__play" aria-label={state === 'playing' ? 'השהיית ההקראה' : 'הפעלת ההקראה'} onClick={() => (state === 'playing' ? pause() : speakFrom(state === 'paused' ? idx.current : 0))}>
        {state === 'playing' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
        )}
      </button>
      <div className="reader__main">
        <div className="reader__head">
          <b>{state === 'idle' ? 'להאזנה למדריך' : state === 'paused' ? 'מושהה' : 'מקריא עכשיו'}</b>
          <span className="reader__eq" aria-hidden="true"><i /><i /><i /><i /></span>
          <small className="reader__meta">{state === 'idle' ? `כ־${minutes} דק׳ האזנה` : `${pos + 1} / ${total}`}</small>
        </div>
        <div className="reader__bar" role="slider" tabIndex={0} aria-label="התקדמות ההקראה (לחצו כדי לדלג)" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} onClick={seek} onKeyDown={barKey}>
          <i style={{ width: `${pct}%` }} />
        </div>
        {!hasVoice ? <small className="reader__warn">אין במכשיר הזה קול בעברית, ולכן ההקראה עלולה להישמע לא טבעית.</small> : null}
      </div>
      <div className="reader__ctl">
        <button type="button" aria-label="משפט קודם" onClick={() => jump(-1)} disabled={state === 'idle'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M19 5l-9 7 9 7z" /></svg>
        </button>
        <button type="button" aria-label="עצירה" onClick={stop} disabled={state === 'idle'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        </button>
        <button type="button" aria-label="משפט הבא" onClick={() => jump(1)} disabled={state === 'idle'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5v14M5 5l9 7-9 7z" /></svg>
        </button>
        <button type="button" className="reader__rate" aria-label={`מהירות הקראה ${fmtRate(rate)}. לחצו לשינוי`} onClick={cycleRate}>{fmtRate(rate)}</button>
      </div>
    </div>
  );
}
