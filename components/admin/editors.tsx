'use client';

import { useEffect } from 'react';
import { Icon } from './Icon';

/** Warns before leaving the page with unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    addEventListener('beforeunload', h);
    return () => removeEventListener('beforeunload', h);
  }, [dirty]);
}

export function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className="ad-count" style={over ? { color: 'var(--ad-danger)' } : undefined}>
      {value.length}/{max}
    </span>
  );
}

/** A list of short strings with add, remove and reorder. Used for deliverables and example steps. */
export function StringList({ label, hint, value, onChange, max = 12, placeholder, multiline }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string; multiline?: boolean }) {
  const set = (i: number, v: string) => onChange(value.map((x, k) => (k === i ? v : x)));
  return (
    <div className="ad-field">
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
      <div className="ad-array">
        {value.map((v, i) => (
          <div className="ad-array__row" key={i}>
            <span>{i + 1}</span>
            {multiline ? (
              <textarea className="ad-textarea" rows={2} value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} aria-label={`${label} ${i + 1}`} />
            ) : (
              <input className="ad-input" value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} aria-label={`${label} ${i + 1}`} />
            )}
            <div className="ad-array__btns">
              <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למעלה" disabled={i === 0} onClick={() => onChange(move(value, i, -1))}>
                <Icon name="up" />
              </button>
              <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למטה" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, 1))}>
                <Icon name="down" />
              </button>
              <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="מחיקה" onClick={() => onChange(value.filter((_, k) => k !== i))}>
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {value.length < max ? (
        <button type="button" className="ad-btn ad-btn--sm" style={{ justifySelf: 'start' }} onClick={() => onChange([...value, ''])}>
          <Icon name="plus" /> הוספה
        </button>
      ) : null}
    </div>
  );
}

/** Question and answer pairs, for per-service FAQs. */
export function QAList({ value, onChange, max = 12 }: { value: { q: string; a: string }[]; onChange: (v: { q: string; a: string }[]) => void; max?: number }) {
  const set = (i: number, patch: Partial<{ q: string; a: string }>) => onChange(value.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <div className="ad-field">
      <span>שאלות נפוצות בעמוד</span>
      <div className="ad-array">
        {value.map((x, i) => (
          <div className="ad-section-edit" key={i}>
            <div className="ad-section-edit__head">
              <span>שאלה {i + 1}</span>
              <div className="ad-array__btns">
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למעלה" disabled={i === 0} onClick={() => onChange(move(value, i, -1))}>
                  <Icon name="up" />
                </button>
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למטה" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, 1))}>
                  <Icon name="down" />
                </button>
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="מחיקה" onClick={() => onChange(value.filter((_, k) => k !== i))}>
                  <Icon name="trash" />
                </button>
              </div>
            </div>
            <input className="ad-input" placeholder="השאלה" value={x.q} onChange={(e) => set(i, { q: e.target.value })} aria-label={`שאלה ${i + 1}`} />
            <textarea className="ad-textarea" rows={3} placeholder="התשובה" value={x.a} onChange={(e) => set(i, { a: e.target.value })} aria-label={`תשובה ${i + 1}`} />
          </div>
        ))}
      </div>
      {value.length < max ? (
        <button type="button" className="ad-btn ad-btn--sm" style={{ justifySelf: 'start' }} onClick={() => onChange([...value, { q: '', a: '' }])}>
          <Icon name="plus" /> הוספת שאלה
        </button>
      ) : null}
    </div>
  );
}
