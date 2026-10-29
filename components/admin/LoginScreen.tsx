'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { login, type LoginState } from '../../app/admin/actions';
import { Wordmark } from '../brand/Logo';
import { Effects } from '../motion/Effects';
import { GlassStage } from '../stage/GlassStage';
import { stageBus } from '../stage/bus';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Sign-in as a scene: the 3D stage reacts to the password (filament lights per character, flinches on a wrong one). */
export function LoginScreen({ ready, next }: { ready: boolean; next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [left, setLeft] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const errId = useId();
  const locked = left > 0;

  // The stage follows the form. Filament length = password length; everything lit while the server checks.
  useEffect(() => {
    const d = stageBus.drive;
    d.filament = pending ? 1 : locked ? 0 : Math.min(1, 0.06 + pw.length * 0.085);
    d.glow = pending ? 0.9 : 0;
  }, [pw, pending, locked]);
  useEffect(
    () => () => {
      Object.assign(stageBus.drive, { filament: -1, glow: 0, dim: 0, kick: 0 });
    },
    [],
  );

  // A failed attempt: shake the card, shove and dim the object, vibrate where the browser allows it.
  useEffect(() => {
    if (!state.error) return;
    setPw('');
    if (state.retryAfter) setLeft(state.retryAfter);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-off');
    if (!calm) navigator.vibrate?.([40, 50, 40]);
    if (!calm) {
      card.current?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-11px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
        { duration: 440, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = now - t0;
      stageBus.drive.kick = calm ? 0 : 0.5 * Math.exp(-t / 230) * Math.sin(t / 55);
      stageBus.drive.dim = -0.55 * Math.exp(-t / 520);
      if (t < 1400) raf = requestAnimationFrame(step);
      else {
        stageBus.drive.kick = 0;
        stageBus.drive.dim = 0;
      }
    };
    raf = requestAnimationFrame(step);
    if (!state.retryAfter && window.matchMedia('(pointer: fine)').matches) input.current?.focus();
    return () => cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [locked]);

  // Desktop focuses the field at once. On touch devices the keyboard stays closed until the person taps.
  useEffect(() => {
    if (ready && window.matchMedia('(pointer: fine)').matches) input.current?.focus();
  }, [ready]);

  // iOS keeps the layout viewport when the keyboard opens: pin the screen to the visual viewport so the sheet stays above it.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = root.current;
    if (!vv || !el) return;
    const apply = () => {
      el.style.setProperty('--vv-h', `${vv.height}px`);
      el.style.setProperty('--vv-t', `${vv.offsetTop}px`);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
    };
  }, []);

  const mode = locked ? 'locked' : pending ? 'pending' : state.error ? 'error' : 'idle';

  return (
    <div ref={root} className="lgn" data-stage="login" data-mode={mode}>
      <GlassStage />
      <Effects />
      <div className="grain" aria-hidden="true" />

      <header className="lgn__top">
        <Link href="/" className="lgn__brand" aria-label="חזרה לאתר">
          <Wordmark />
        </Link>
        <span className="lgn__tag">ניהול</span>
      </header>

      <main className="lgn__main">
        <div ref={card} className="lgn__card lg lg--dense lg--ice" data-refract="26">
          <div className="lgn__head">
            <span className="lgn__pill">
              <i aria-hidden="true" />
              {ready ? 'כניסה לבעלי האתר' : 'לא מוגדר'}
            </span>
            <h1>כניסה לניהול</h1>
            <p>{ready ? 'לידים, תוכן והגדרות של האתר, במקום אחד.' : 'ממשק הניהול עדיין לא הוגדר בשרת הזה.'}</p>
          </div>

          {ready ? (
            <form action={action} noValidate autoComplete="on">
              <input type="hidden" name="next" value={next} />
              <label className="lgn__label" htmlFor="pw">
                סיסמה
              </label>
              <div className="lgn__field" data-invalid={Boolean(state.error) || undefined}>
                <input
                  ref={input}
                  id="pw"
                  className="lgn__input"
                  type={show ? 'text' : 'password'}
                  dir={show ? 'ltr' : undefined}
                  name="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => setCaps(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                  onBlur={() => setCaps(false)}
                  autoComplete="current-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  required
                  readOnly={locked}
                  aria-invalid={Boolean(state.error)}
                  aria-describedby={state.error ? errId : undefined}
                  placeholder="הקלידו את הסיסמה"
                />
                <button type="button" className="lgn__eye" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {show ? null : <path d="M4 4l16 16" />}
                  </svg>
                </button>
                <span className="lgn__signal" aria-hidden="true" style={{ '--p': Math.min(1, pw.length / 14) } as React.CSSProperties} />
              </div>

              <div className="lgn__msgs" aria-live="polite">
                {caps ? <p className="lgn__hint">Caps Lock דולק</p> : null}
                {state.error ? (
                  <p id={errId} className="lgn__error" role="alert">
                    {state.retryAfter ? (locked ? `נעילה זמנית. אפשר לנסות שוב בעוד ${clock(left)}` : 'אפשר לנסות שוב') : state.error}
                  </p>
                ) : null}
              </div>

              <button type="submit" className="lgn__submit" disabled={pending || locked || pw.length === 0} aria-busy={pending}>
                {pending ? <span className="lgn__spin" aria-hidden="true" /> : null}
                <span>{pending ? 'בודקים' : 'כניסה'}</span>
                {pending ? null : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5M11 6l-6 6 6 6" />
                  </svg>
                )}
              </button>
            </form>
          ) : (
            <div className="lgn__setup">
              <p>כדי להפעיל אותו צריך להגדיר את משתני הסביבה האלה (ראו README):</p>
              <pre>{`CONVEX_URL\nADMIN_API_KEY\nADMIN_SESSION_SECRET\nADMIN_PASSWORD_HASH`}</pre>
            </div>
          )}

          <footer className="lgn__foot">
            <span>הכניסה תקפה 12 שעות ונרשמת ביומן.</span>
            <Link href="/">חזרה לאתר</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
