'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pageDelete, pageSetStatus } from '../../app/admin/actions';
import { Icon } from './Icon';
import { timeAgo, useAct, useAdmin } from './ui';

type Row = { _id: string; slug: string; title: string; status: 'draft' | 'published'; blockCount: number; updatedAt: number };

export function PagesList({ docs }: { docs: Row[] }) {
  const router = useRouter();
  const { act } = useAct();
  const { confirm } = useAdmin();

  async function toggle(p: Row) {
    const next = p.status === 'published' ? 'draft' : 'published';
    const r = await act(() => pageSetStatus(p._id, next), next === 'published' ? 'הדף פורסם' : 'הדף הוחזר לטיוטה');
    if (r.ok) router.refresh();
  }
  async function remove(p: Row) {
    if (!(await confirm({ title: `למחוק את "${p.title}"?`, text: 'אי אפשר לשחזר.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => pageDelete(p._id), 'נמחק');
    if (r.ok) router.refresh();
  }

  return (
    <div className="ad-list">
      {docs.map((p) => (
        <div className="ad-item" key={p._id}>
          <div className="ad-item__main">
            <Link href={`/admin/pages/${p._id}`}><b>{p.title}</b></Link>
            <small suppressHydrationWarning>/lp/{p.slug}/ · {p.blockCount} בלוקים · עודכן {timeAgo(p.updatedAt)}</small>
          </div>
          <span className="ad-badge" data-s={p.status}>{p.status === 'published' ? 'פורסם' : 'טיוטה'}</span>
          <div className="ad-actions">
            {p.status === 'published' ? (
              <a className="ad-btn ad-btn--sm" href={`/lp/${p.slug}/`} target="_blank" rel="noopener noreferrer"><Icon name="eye" /> צפייה</a>
            ) : null}
            <button type="button" className="ad-btn ad-btn--sm" onClick={() => toggle(p)}>{p.status === 'published' ? 'החזרה לטיוטה' : 'פרסום'}</button>
            <Link href={`/admin/pages/${p._id}`} className="ad-btn ad-btn--sm"><Icon name="edit" /> עריכה</Link>
            <button type="button" className="ad-btn ad-btn--sm ad-btn--icon ad-btn--danger" aria-label={`מחיקת ${p.title}`} onClick={() => remove(p)}><Icon name="trash" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
