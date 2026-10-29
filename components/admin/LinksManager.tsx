'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { linkCreate, linkDelete, linkUpdate } from '../../app/admin/actions';
import type { Doc } from '../../convex/_generated/dataModel';
import { Icon } from './Icon';
import { timeAgo, useAct, useAdmin } from './ui';

export function LinksManager({ docs, origin }: { docs: Doc<'links'>[]; origin: string }) {
  const router = useRouter();
  const { act, pending } = useAct();
  const { confirm } = useAdmin();
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });
  const [copied, setCopied] = useState('');

  const withUtm = () => {
    try {
      const u = new URL(url);
      for (const [k, v] of Object.entries(utm)) if (v.trim()) u.searchParams.set(`utm_${k}`, v.trim());
      return u.toString();
    } catch {
      return url;
    }
  };

  async function create() {
    const r = await act(() => linkCreate({ url: withUtm(), code, note }), 'הקישור נוצר');
    if (!r.ok) return;
    setUrl('');
    setCode('');
    setNote('');
    setUtm({ source: '', medium: '', campaign: '' });
    await copy(r.data.code);
    router.refresh();
  }

  async function copy(c: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/go/${c}`);
      setCopied(c);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard may be blocked; the link is visible anyway */
    }
  }

  async function toggle(l: Doc<'links'>) {
    const r = await act(() => linkUpdate(l._id, { active: !l.active }), l.active ? 'הקישור הושהה' : 'הקישור פעיל');
    if (r.ok) router.refresh();
  }

  async function remove(l: Doc<'links'>) {
    if (!(await confirm({ title: `למחוק את /go/${l.code}?`, text: 'הקישור יפסיק לעבוד בכל מקום שבו פרסמתם אותו.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => linkDelete(l._id), 'נמחק');
    if (r.ok) router.refresh();
  }

  const total = docs.reduce((n, l) => n + l.clicks, 0);

  return (
    <div className="ad-editor">
      <div className="ad-card">
        <div className="ad-card__head">
          <h2>קישור קצר חדש</h2>
          <p>{docs.length} קישורים · {total} קליקים</p>
        </div>
        <label className="ad-field">
          <span>כתובת היעד</span>
          <input className="ad-input ltr" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://getsystm.com/lp/webinar/" />
        </label>
        <div className="ad-row ad-row--3">
          <label className="ad-field">
            <span>קוד (לא חובה)</span>
            <input className="ad-input ltr" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} maxLength={40} placeholder="webinar" />
            <small>{origin}/go/{code || '…'}</small>
          </label>
          <label className="ad-field">
            <span>הערה</span>
            <input className="ad-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="קמפיין אינסטגרם" />
          </label>
        </div>
        <details className="ad-details">
          <summary>הוספת פרמטרים של UTM</summary>
          <div className="ad-row ad-row--3">
            {(['source', 'medium', 'campaign'] as const).map((k) => (
              <label className="ad-field" key={k}>
                <span>utm_{k}</span>
                <input className="ad-input ltr" dir="ltr" value={utm[k]} onChange={(e) => setUtm({ ...utm, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </details>
        <button type="button" className="ad-btn ad-btn--primary" style={{ justifySelf: 'start' }} disabled={pending || !url.trim()} aria-busy={pending} onClick={create}>
          <Icon name="plus" /> יצירה והעתקה
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="ad-card ad-empty">
          <b>אין קישורים קצרים</b>
          <span>צרו את הראשון למעלה.</span>
        </div>
      ) : (
        <div className="ad-list">
          {docs.map((l) => (
            <div className="ad-item" key={l._id}>
              <div className="ad-item__main">
                <b dir="ltr" style={{ textAlign: 'start' }}>/go/{l.code}</b>
                <small dir="ltr" style={{ textAlign: 'start', overflowWrap: 'anywhere' }}>{l.url}</small>
                <small suppressHydrationWarning>
                  {l.note ? `${l.note} · ` : ''}נוצר {timeAgo(l.createdAt)}
                  {l.lastClickAt ? ` · קליק אחרון ${timeAgo(l.lastClickAt)}` : ''}
                </small>
              </div>
              <span className="ad-badge" data-s={l.active ? 'published' : 'draft'}>{l.clicks} קליקים</span>
              <div className="ad-actions">
                <button type="button" className="ad-btn ad-btn--sm" onClick={() => copy(l.code)}>
                  <Icon name={copied === l.code ? 'check' : 'copy'} /> {copied === l.code ? 'הועתק' : 'העתקה'}
                </button>
                <button type="button" className="ad-btn ad-btn--sm" onClick={() => toggle(l)}>
                  {l.active ? 'השהיה' : 'הפעלה'}
                </button>
                <button type="button" className="ad-btn ad-btn--sm ad-btn--icon ad-btn--danger" aria-label={`מחיקת ${l.code}`} onClick={() => remove(l)}>
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
