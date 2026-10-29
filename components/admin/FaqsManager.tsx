'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { faqDelete, faqReorder, faqSave } from '../../app/admin/actions';
import type { Doc } from '../../convex/_generated/dataModel';
import { Counter, move } from './editors';
import { Icon } from './Icon';
import { Switch, useAct, useAdmin } from './ui';

type Faq = Doc<'faqs'>;

export function FaqsManager({ docs }: { docs: Faq[] }) {
  const router = useRouter();
  const { act } = useAct();
  const { confirm } = useAdmin();
  const [list, setList] = useState(docs);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ q: '', a: '', published: true });
  useEffect(() => setList(docs), [docs]);

  async function reorder(i: number, d: -1 | 1) {
    const next = move(list, i, d);
    setList(next);
    const r = await act(() => faqReorder(next.map((f) => f._id)), 'הסדר עודכן');
    if (!r.ok) setList(docs);
  }

  async function add() {
    const r = await act(() => faqSave(null, draft), 'השאלה נוספה');
    if (r.ok) {
      setDraft({ q: '', a: '', published: true });
      router.refresh();
    }
  }

  async function remove(f: Faq) {
    if (!(await confirm({ title: 'למחוק את השאלה?', text: f.q, confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => faqDelete(f._id), 'נמחקה');
    if (r.ok) router.refresh();
  }

  return (
    <div className="ad-grid" style={{ gap: 16 }}>
      <div className="ad-card" style={{ display: 'grid', gap: 12 }}>
        <div className="ad-card__head">
          <h2>שאלה חדשה</h2>
        </div>
        <label className="ad-field">
          <span>שאלה</span>
          <input className="ad-input" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} maxLength={300} />
        </label>
        <label className="ad-field">
          <span>תשובה</span>
          <textarea className="ad-textarea" rows={3} value={draft.a} onChange={(e) => setDraft({ ...draft, a: e.target.value })} maxLength={2000} />
          <Counter value={draft.a} max={2000} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Switch checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })}>
            מוצגת באתר
          </Switch>
          <button type="button" className="ad-btn ad-btn--primary" disabled={!draft.q.trim() || !draft.a.trim()} onClick={add}>
            <Icon name="plus" /> הוספה
          </button>
        </div>
      </div>

      <div className="ad-list">
        {list.map((f, i) => (
          <FaqRow
            key={f._id}
            faq={f}
            open={open === f._id}
            onToggle={() => setOpen(open === f._id ? null : f._id)}
            first={i === 0}
            last={i === list.length - 1}
            onMove={(d) => reorder(i, d)}
            onDelete={() => remove(f)}
            onSaved={() => router.refresh()}
          />
        ))}
        {list.length === 0 ? (
          <div className="ad-card ad-empty">
            <b>אין שאלות עדיין</b>
            <span>הוסיפו את הראשונה למעלה.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FaqRow({ faq, open, onToggle, first, last, onMove, onDelete, onSaved }: { faq: Faq; open: boolean; onToggle: () => void; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onDelete: () => void; onSaved: () => void }) {
  const { act, pending } = useAct();
  const [f, setF] = useState({ q: faq.q, a: faq.a, published: faq.published });
  const dirty = f.q !== faq.q || f.a !== faq.a || f.published !== faq.published;
  useEffect(() => setF({ q: faq.q, a: faq.a, published: faq.published }), [faq]);

  async function save(next = f) {
    const r = await act(() => faqSave(faq._id, next), 'נשמר');
    if (r.ok) onSaved();
  }

  return (
    <div className="ad-card" style={{ padding: 14, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" style={{ minHeight: 24, height: 24 }} aria-label="הזזה למעלה" disabled={first} onClick={() => onMove(-1)}>
            <Icon name="up" />
          </button>
          <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" style={{ minHeight: 24, height: 24 }} aria-label="הזזה למטה" disabled={last} onClick={() => onMove(1)}>
            <Icon name="down" />
          </button>
        </div>
        <button type="button" onClick={onToggle} aria-expanded={open} style={{ flex: 1, textAlign: 'start', fontWeight: 500, fontSize: 15, padding: '6px 0' }}>
          {faq.q}
        </button>
        <span className="ad-badge" data-s={faq.published ? 'published' : 'draft'}>
          {faq.published ? 'מוצגת' : 'מוסתרת'}
        </span>
        <button type="button" className="ad-btn ad-btn--icon ad-btn--sm ad-btn--danger" aria-label="מחיקה" onClick={onDelete}>
          <Icon name="trash" />
        </button>
      </div>
      {open ? (
        <div className="ad-row">
          <label className="ad-field">
            <span>שאלה</span>
            <input className="ad-input" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} maxLength={300} />
          </label>
          <label className="ad-field">
            <span>תשובה</span>
            <textarea className="ad-textarea" rows={4} value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} maxLength={2000} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Switch checked={f.published} onChange={(v) => setF({ ...f, published: v })}>
              מוצגת באתר
            </Switch>
            <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={!dirty || pending || !f.q.trim() || !f.a.trim()} onClick={() => save()}>
              שמירה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
