'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { serviceDelete, serviceSave } from '../../app/admin/actions';
import { Counter, QAList, StringList, useUnsavedGuard } from './editors';
import { Icon } from './Icon';
import { Switch, useAct, useAdmin } from './ui';
import { Select } from '../ui/Select';

export type ServiceInput = {
  slug: string;
  published: boolean;
  number: string;
  label: string;
  short: string;
  title: string;
  intro: string;
  meta: string;
  items: string[];
  example: string[];
  fit: string;
  outcome: string;
  faqs: { q: string; a: string }[];
  diagram: string;
};

export const EMPTY_SERVICE: ServiceInput = { slug: '', published: false, number: '06', label: '', short: '', title: '', intro: '', meta: '', items: [''], example: [''], fit: '', outcome: '', faqs: [], diagram: 'consulting' };

const DIAGRAMS = [
  ['ai-agents', 'סוכן עם כלים ואישור'],
  ['automation', 'שרשרת אוטומציה'],
  ['consulting', 'מטריצת עדיפויות'],
  ['workshops', 'מפגש ולוח'],
  ['claude-code', 'חלון קוד'],
];

const clean = (d: ServiceInput): ServiceInput => ({ ...d, items: d.items.map((x) => x.trim()).filter(Boolean), example: d.example.map((x) => x.trim()).filter(Boolean), faqs: d.faqs.filter((f) => f.q.trim() && f.a.trim()) });

export function ServiceEditor({ id, initial }: { id: string | null; initial: ServiceInput }) {
  const router = useRouter();
  const { confirm } = useAdmin();
  const { act, pending } = useAct();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(saved), [d, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof ServiceInput>(k: K, v: ServiceInput[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    const data = clean(d);
    const r = await act(() => serviceSave(id, data), 'נשמר, והאתר מתעדכן');
    if (!r.ok) return;
    setD(data);
    setSaved(data);
    if (!id) router.replace(`/admin/services/${r.data}`);
    else router.refresh();
  }

  async function remove() {
    if (!id) return;
    if (!(await confirm({ title: `למחוק את "${d.label}"?`, text: 'העמוד שלו יפסיק להתקיים באתר, והקישורים אליו יובילו ל־404. אפשר גם רק להסתיר אותו.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => serviceDelete(id), 'השירות נמחק');
    if (r.ok) router.replace('/admin/services');
  }

  return (
    <div className="ad-editor">
      <div className="ad-card">
        <div className="ad-card__head">
          <h2>כללי</h2>
          <Switch checked={d.published} onChange={(v) => set('published', v)}>
            מוצג באתר
          </Switch>
        </div>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>שם השירות</span>
            <input className="ad-input" value={d.label} onChange={(e) => set('label', e.target.value)} maxLength={80} />
            <small>מופיע בתפריט, בכרטיס ובטופס.</small>
          </label>
          <label className="ad-field">
            <span>כתובת בעמוד (slug)</span>
            <input className="ad-input ltr" dir="ltr" value={d.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="my-service" maxLength={60} />
            <small>/services/{d.slug || '…'}/ · אנגלית קטנה, ספרות ומקפים. שינוי שלה מנתק קישורים קיימים.</small>
          </label>
        </div>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>מספר סידורי</span>
            <input className="ad-input ltr" dir="ltr" value={d.number} onChange={(e) => set('number', e.target.value)} maxLength={4} />
          </label>
          <label className="ad-field">
            <span>איור</span>
            <Select aria-label="איור" value={d.diagram} onChange={(v) => set('diagram', v)} options={DIAGRAMS.map(([v, l]) => ({ value: v, label: l }))} />
            <small>האיור החי שמופיע בכרטיס ובעמוד.</small>
          </label>
        </div>
        <label className="ad-field">
          <span>משפט קצר לכרטיס</span>
          <input className="ad-input" value={d.short} onChange={(e) => set('short', e.target.value)} maxLength={300} />
          <Counter value={d.short} max={300} />
        </label>
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>העמוד</h2>
        </div>
        <label className="ad-field">
          <span>כותרת ראשית (H1)</span>
          <input className="ad-input" value={d.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
        </label>
        <label className="ad-field">
          <span>פסקת פתיחה</span>
          <textarea className="ad-textarea" rows={3} value={d.intro} onChange={(e) => set('intro', e.target.value)} maxLength={800} />
          <Counter value={d.intro} max={800} />
        </label>
        <label className="ad-field">
          <span>תיאור לגוגל (meta description)</span>
          <textarea className="ad-textarea" rows={2} value={d.meta} onChange={(e) => set('meta', e.target.value)} maxLength={300} />
          <small>עד 160 תווים נראים בתוצאות החיפוש. כרגע {d.meta.length}.</small>
        </label>
        <StringList label="מה התהליך כולל" hint="בדרך כלל ארבעה פריטים." value={d.items} onChange={(v) => set('items', v)} max={8} placeholder="פריט" />
        <StringList label="שלבי ההמחשה" hint="מופיעים כרצף. באתר הם מסומנים כהמחשה בלבד." value={d.example} onChange={(v) => set('example', v)} max={8} placeholder="שלב" />
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>למי זה מתאים</span>
            <textarea className="ad-textarea" rows={3} value={d.fit} onChange={(e) => set('fit', e.target.value)} maxLength={500} />
          </label>
          <label className="ad-field">
            <span>עם מה יוצאים</span>
            <textarea className="ad-textarea" rows={3} value={d.outcome} onChange={(e) => set('outcome', e.target.value)} maxLength={500} />
          </label>
        </div>
        <QAList value={d.faqs} onChange={(v) => set('faqs', v)} />
      </div>

      <div className="ad-sticky-save">
        <span>{dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'}</span>
        <div className="ad-actions">
          {id && d.published ? (
            <a className="ad-btn" href={`/services/${d.slug}/`} target="_blank" rel="noopener noreferrer">
              <Icon name="eye" /> צפייה בעמוד
            </a>
          ) : null}
          <Link href="/admin/services" className="ad-btn ad-btn--ghost">
            חזרה לרשימה
          </Link>
          {id ? (
            <button type="button" className="ad-btn ad-btn--danger" onClick={remove}>
              <Icon name="trash" /> מחיקה
            </button>
          ) : null}
          <button type="button" className="ad-btn ad-btn--primary" disabled={pending || !dirty || !d.label.trim() || !d.slug} aria-busy={pending} onClick={save}>
            {pending ? 'שומרים...' : 'שמירה'}
          </button>
        </div>
      </div>
    </div>
  );
}
