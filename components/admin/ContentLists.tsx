'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { articleDelete, articleSetStatus, serviceReorder, serviceSave } from '../../app/admin/actions';
import type { Doc } from '../../convex/_generated/dataModel';
import { move } from './editors';
import { Icon } from './Icon';
import { timeAgo, useAct, useAdmin } from './ui';

export function ServicesList({ docs }: { docs: Doc<'services'>[] }) {
  const router = useRouter();
  const { act } = useAct();
  const [list, setList] = useState(docs);
  useEffect(() => setList(docs), [docs]);

  async function reorder(i: number, d: -1 | 1) {
    const next = move(list, i, d);
    setList(next);
    const r = await act(() => serviceReorder(next.map((s) => s._id)), 'הסדר עודכן');
    if (!r.ok) setList(docs);
  }

  async function toggle(s: Doc<'services'>) {
    const { _id, _creationTime, order, updatedAt, ...rest } = s;
    void _id;
    void _creationTime;
    void order;
    void updatedAt;
    const r = await act(() => serviceSave(s._id, { ...rest, published: !s.published }), s.published ? 'השירות הוסתר' : 'השירות מוצג');
    if (r.ok) router.refresh();
  }

  return (
    <div className="ad-list">
      {list.map((s, i) => (
        <div className="ad-item" key={s._id}>
          <div style={{ display: 'grid', gap: 2 }}>
            <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" style={{ minHeight: 24, height: 24 }} aria-label={`הזזת ${s.label} למעלה`} disabled={i === 0} onClick={() => reorder(i, -1)}>
              <Icon name="up" />
            </button>
            <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" style={{ minHeight: 24, height: 24 }} aria-label={`הזזת ${s.label} למטה`} disabled={i === list.length - 1} onClick={() => reorder(i, 1)}>
              <Icon name="down" />
            </button>
          </div>
          <span style={{ color: 'var(--ad-ice)', fontSize: 12, letterSpacing: '0.12em', width: 26 }}>{s.number}</span>
          <div className="ad-item__main">
            <Link href={`/admin/services/${s._id}`}>
              <b>{s.label}</b>
            </Link>
            <small suppressHydrationWarning>
              /services/{s.slug}/ · עודכן {timeAgo(s.updatedAt)}
            </small>
          </div>
          <span className="ad-badge" data-s={s.published ? 'published' : 'draft'}>
            {s.published ? 'מוצג' : 'מוסתר'}
          </span>
          <div className="ad-actions">
            <button type="button" className="ad-btn ad-btn--sm" onClick={() => toggle(s)}>
              {s.published ? 'הסתרה' : 'הצגה'}
            </button>
            <Link href={`/admin/services/${s._id}`} className="ad-btn ad-btn--sm">
              <Icon name="edit" /> עריכה
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArticlesList({ docs }: { docs: Doc<'articles'>[] }) {
  const router = useRouter();
  const { act } = useAct();
  const { confirm } = useAdmin();

  async function toggle(a: Doc<'articles'>) {
    const next = a.status === 'published' ? 'draft' : 'published';
    const r = await act(() => articleSetStatus(a._id, next), next === 'published' ? 'המדריך פורסם' : 'המדריך הוחזר לטיוטה');
    if (r.ok) router.refresh();
  }

  async function remove(a: Doc<'articles'>) {
    if (!(await confirm({ title: `למחוק את "${a.title}"?`, text: 'אי אפשר לשחזר. אפשר גם להחזיר לטיוטה כדי להסתיר.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => articleDelete(a._id), 'נמחק');
    if (r.ok) router.refresh();
  }

  return (
    <div className="ad-list">
      {docs.map((a) => (
        <div className="ad-item" key={a._id}>
          <div className="ad-item__main">
            <Link href={`/admin/articles/${a._id}`}>
              <b>{a.title}</b>
            </Link>
            <small suppressHydrationWarning>
              {a.category} · {a.sections.length} פרקים · עודכן {timeAgo(a.updatedAt)}
            </small>
          </div>
          <span className="ad-badge" data-s={a.status}>
            {a.status === 'published' ? 'פורסם' : 'טיוטה'}
          </span>
          <div className="ad-actions">
            <button type="button" className="ad-btn ad-btn--sm" onClick={() => toggle(a)}>
              {a.status === 'published' ? 'החזרה לטיוטה' : 'פרסום'}
            </button>
            <Link href={`/admin/articles/${a._id}`} className="ad-btn ad-btn--sm">
              <Icon name="edit" /> עריכה
            </Link>
            <button type="button" className="ad-btn ad-btn--sm ad-btn--icon ad-btn--danger" aria-label={`מחיקת ${a.title}`} onClick={() => remove(a)}>
              <Icon name="trash" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
