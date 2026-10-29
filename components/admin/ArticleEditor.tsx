'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { articleDelete, articleSave } from '../../app/admin/actions';
import { Counter, move, useUnsavedGuard } from './editors';
import { Icon } from './Icon';
import { useAct, useAdmin } from './ui';

export type ArticleInput = { slug: string; status: 'draft' | 'published'; category: string; title: string; summary: string; read: string; sections: { h: string; t: string }[] };

export const EMPTY_ARTICLE: ArticleInput = { slug: '', status: 'draft', category: '', title: '', summary: '', read: '4 דקות קריאה', sections: [{ h: '', t: '' }] };

const words = (a: ArticleInput) => a.sections.reduce((n, s) => n + `${s.h} ${s.t}`.split(/\s+/).filter(Boolean).length, 0);
const readLabel = (n: number) => `${Math.max(1, Math.round(n / 200))} דקות קריאה`;

export function ArticleEditor({ id, initial }: { id: string | null; initial: ArticleInput }) {
  const router = useRouter();
  const { confirm } = useAdmin();
  const { act, pending } = useAct();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(saved), [d, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof ArticleInput>(k: K, v: ArticleInput[K]) => setD((p) => ({ ...p, [k]: v }));
  const setSection = (i: number, patch: Partial<{ h: string; t: string }>) => set('sections', d.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const wc = words(d);

  async function save(status?: 'draft' | 'published') {
    const data = { ...d, status: status ?? d.status, sections: d.sections.filter((s) => s.h.trim() || s.t.trim()) };
    const r = await act(() => articleSave(id, data), data.status === 'published' ? 'נשמר, והמדריך באתר' : 'נשמר כטיוטה');
    if (!r.ok) return;
    setD(data);
    setSaved(data);
    if (!id) router.replace(`/admin/articles/${r.data}`);
    else router.refresh();
  }

  async function remove() {
    if (!id) return;
    if (!(await confirm({ title: `למחוק את "${d.title}"?`, text: 'אי אפשר לשחזר.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => articleDelete(id), 'נמחק');
    if (r.ok) router.replace('/admin/articles');
  }

  return (
    <div className="ad-editor">
      <div className="ad-card">
        <div className="ad-card__head">
          <h2>פרטי המדריך</h2>
          <span className="ad-badge" data-s={d.status}>
            {d.status === 'published' ? 'מפורסם' : 'טיוטה'}
          </span>
        </div>
        <label className="ad-field">
          <span>כותרת</span>
          <input className="ad-input" value={d.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
          <Counter value={d.title} max={200} />
        </label>
        <label className="ad-field">
          <span>תקציר</span>
          <textarea className="ad-textarea" rows={2} value={d.summary} onChange={(e) => set('summary', e.target.value)} maxLength={500} />
          <small>מופיע בכרטיס, בראש המדריך ובתיאור לגוגל.</small>
          <Counter value={d.summary} max={500} />
        </label>
        <div className="ad-row ad-row--3">
          <label className="ad-field">
            <span>קטגוריה</span>
            <input className="ad-input" value={d.category} onChange={(e) => set('category', e.target.value)} maxLength={60} placeholder="אוטומציות" />
          </label>
          <label className="ad-field">
            <span>זמן קריאה</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="ad-input" value={d.read} onChange={(e) => set('read', e.target.value)} maxLength={30} />
              <button type="button" className="ad-btn ad-btn--sm" onClick={() => set('read', readLabel(wc))} title={`${wc} מילים`}>
                חישוב
              </button>
            </div>
            <small>{wc} מילים עכשיו.</small>
          </label>
          <label className="ad-field">
            <span>כתובת (slug)</span>
            <input className="ad-input ltr" dir="ltr" value={d.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="how-to-start" maxLength={60} />
            <small>/knowledge/{d.slug || '…'}/</small>
          </label>
        </div>
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>פרקים</h2>
          <p>כל פרק מופיע בתוכן העניינים</p>
        </div>
        {d.sections.map((s, i) => (
          <div className="ad-section-edit" key={i}>
            <div className="ad-section-edit__head">
              <span>פרק {String(i + 1).padStart(2, '0')}</span>
              <div className="ad-array__btns">
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למעלה" disabled={i === 0} onClick={() => set('sections', move(d.sections, i, -1))}>
                  <Icon name="up" />
                </button>
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הזזה למטה" disabled={i === d.sections.length - 1} onClick={() => set('sections', move(d.sections, i, 1))}>
                  <Icon name="down" />
                </button>
                <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="מחיקת הפרק" onClick={() => set('sections', d.sections.filter((_, k) => k !== i))}>
                  <Icon name="trash" />
                </button>
              </div>
            </div>
            <input className="ad-input" placeholder="כותרת הפרק" value={s.h} onChange={(e) => setSection(i, { h: e.target.value })} maxLength={200} aria-label={`כותרת פרק ${i + 1}`} />
            <textarea className="ad-textarea" rows={6} placeholder="הטקסט של הפרק" value={s.t} onChange={(e) => setSection(i, { t: e.target.value })} maxLength={8000} aria-label={`טקסט פרק ${i + 1}`} />
          </div>
        ))}
        {d.sections.length < 20 ? (
          <button type="button" className="ad-btn ad-btn--sm" style={{ justifySelf: 'start' }} onClick={() => set('sections', [...d.sections, { h: '', t: '' }])}>
            <Icon name="plus" /> פרק חדש
          </button>
        ) : null}
      </div>

      <div className="ad-sticky-save">
        <span>{dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'}</span>
        <div className="ad-actions">
          {id && d.status === 'published' ? (
            <a className="ad-btn" href={`/knowledge/${d.slug}/`} target="_blank" rel="noopener noreferrer">
              <Icon name="eye" /> צפייה באתר
            </a>
          ) : null}
          <Link href="/admin/articles" className="ad-btn ad-btn--ghost">
            חזרה לרשימה
          </Link>
          {id ? (
            <button type="button" className="ad-btn ad-btn--danger" onClick={remove}>
              <Icon name="trash" /> מחיקה
            </button>
          ) : null}
          <button type="button" className="ad-btn" disabled={pending || !d.title.trim() || !d.slug} onClick={() => save('draft')}>
            שמירה כטיוטה
          </button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={pending || !d.title.trim() || !d.slug} aria-busy={pending} onClick={() => save('published')}>
            {d.status === 'published' ? 'שמירה ופרסום' : 'פרסום'}
          </button>
        </div>
      </div>
    </div>
  );
}
