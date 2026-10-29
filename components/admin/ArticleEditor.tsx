'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { articleDelete, articleSave } from '../../app/admin/actions';
import { COVER_STYLES } from '../../lib/cover';
import { bodyWordCount, outlineOf, sectionsToHtml } from '../../lib/html-utils';
import { ArticleArt } from '../sections/ArticleArt';
import { seoChecks, seoScore } from '../../lib/seo-score';
import { Counter, useUnsavedGuard } from './editors';
import { Icon } from './Icon';
import { RichEditor } from './RichEditor';
import { useAct, useAdmin } from './ui';

export type ArticleInput = {
  slug: string;
  status: 'draft' | 'published';
  category: string;
  title: string;
  summary: string;
  read: string;
  sections: { h: string; t: string }[];
  /** Rich-text HTML. Articles written before the rich editor only have `sections`; they are converted on load. */
  body?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  ogImage?: string;
  /** Generated cover (lib/cover.ts). Both unset = derived from the slug. */
  coverStyle?: number;
  coverSeed?: number;
  narration?: boolean;
  showToc?: boolean;
};

export const EMPTY_ARTICLE: ArticleInput = { slug: '', status: 'draft', category: '', title: '', summary: '', read: '4 דקות קריאה', sections: [], body: '' };

const words = (a: ArticleInput) => bodyWordCount(a.body ?? '');
const readLabel = (n: number) => `${Math.max(1, Math.round(n / 200))} דקות קריאה`;

export function ArticleEditor({ id, initial: raw }: { id: string | null; initial: ArticleInput }) {
  const router = useRouter();
  const initial = useMemo(() => ({ ...raw, body: raw.body ?? sectionsToHtml(raw.sections) }), [raw]);
  const { confirm } = useAdmin();
  const { act, pending } = useAct();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(saved), [d, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof ArticleInput>(k: K, v: ArticleInput[K]) => setD((p) => ({ ...p, [k]: v }));
  const wc = words(d);
  const checks = useMemo(() => seoChecks({ title: d.title, summary: d.summary, slug: d.slug, seoTitle: d.seoTitle, seoDescription: d.seoDescription, focusKeyword: d.focusKeyword, bodyHtml: d.body ?? '', bodyText: (d.body ?? '').replace(/<[^>]+>/g, ' ') }), [d]);
  const score = seoScore(checks);
  const outline = useMemo(() => outlineOf(d.body ?? ''), [d.body]);
  const hasInlineToc = /data-type="toc"/.test(d.body ?? '');
  const coverArt = { slug: d.slug || 'preview', coverStyle: d.coverStyle, coverSeed: d.coverSeed };
  const TOC_TAG = '<div data-type="toc"></div>';

  async function save(status?: 'draft' | 'published') {
    const data = { ...d, status: status ?? d.status };
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
          <h2>תוכן המדריך</h2>
          <p>{wc} מילים · כותרות H2 יוצרות את תוכן העניינים</p>
        </div>
        <RichEditor value={d.body ?? ''} onChange={(html) => set('body', html)} />
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>תמונת Cover</h2>
          <p>נוצרת אוטומטית לכל מדריך לפי הכתובת שלו</p>
        </div>
        <div className="cover-admin">
          <div className="cover-admin__main art-hover">
            <ArticleArt a={coverArt} i={0} />
          </div>
          <div className="cover-admin__side">
            <div className="ad-actions">
              <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => setD((p) => ({ ...p, coverSeed: Math.floor(Math.random() * 1_000_000) }))}>
                <Icon name="refresh" /> יצירה מחדש
              </button>
              <button type="button" className="ad-btn ad-btn--sm" disabled={d.coverSeed === undefined && d.coverStyle === undefined} onClick={() => setD((p) => ({ ...p, coverSeed: undefined, coverStyle: undefined }))}>
                חזרה לאוטומטי
              </button>
            </div>
            <small>בחירת קומפוזיציה (הווריאציה בכל קומפוזיציה נשארת ייחודית למדריך):</small>
            <div className="cover-admin__styles" role="group" aria-label="סגנון כיסוי">
              {Array.from({ length: COVER_STYLES }, (_, n) => (
                <button key={n} type="button" data-on={d.coverStyle === n || undefined} aria-pressed={d.coverStyle === n} aria-label={`סגנון ${n + 1}`} onClick={() => setD((p) => ({ ...p, coverStyle: n }))}>
                  <ArticleArt a={{ ...coverArt, coverStyle: n }} i={n} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ad-card toc-card">
        <div className="ad-card__head">
          <h2>תוכן עניינים</h2>
          <p>נבנה אוטומטית מכותרות H2 ו־H3</p>
        </div>
        <label className="ad-switch-row">
          <input type="checkbox" checked={d.showToc !== false} onChange={(e) => setD((p) => ({ ...p, showToc: e.target.checked }))} />
          <span>להציג תוכן עניינים בצד המדריך</span>
        </label>
        <div className="ad-actions">
          <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={hasInlineToc || outline.length < 2} onClick={() => setD((p) => ({ ...p, showToc: true, body: TOC_TAG + (p.body ?? '') }))}>
            <Icon name="plus" /> יצירת תוכן עניינים אוטומטי בראש הטקסט
          </button>
          {hasInlineToc ? (
            <button type="button" className="ad-btn ad-btn--sm" onClick={() => setD((p) => ({ ...p, body: (p.body ?? '').replace(/<div[^>]*data-type="toc"[^>]*><\/div>/g, '') }))}>
              הסרה מהטקסט
            </button>
          ) : null}
        </div>
        {outline.length < 2 ? <small>הוסיפו לפחות שתי כותרות (H2) בעורך כדי שייווצר תוכן עניינים.</small> : (
          <ol aria-label="הכותרות שייכנסו לתוכן העניינים">
            {outline.map((o) => (
              <li key={o.id} data-l={o.level}>{o.text || '(כותרת ריקה)'}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>הקראה קולית</h2>
          <p>נגן בראש המדריך</p>
        </div>
        <label className="ad-switch-row">
          <input type="checkbox" checked={d.narration !== false} onChange={(e) => setD((p) => ({ ...p, narration: e.target.checked }))} />
          <span>להציע לגולשים להאזין למדריך (הקראה בקול של המכשיר שלהם, בעברית כשיש קול מתאים)</span>
        </label>
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>קידום בגוגל (SEO)</h2>
          <span className="ad-badge" data-s={score >= 80 ? 'published' : 'draft'}>ציון {score}</span>
        </div>
        <div className="seo-serp" aria-label="תצוגה מקדימה בגוגל">
          <small dir="ltr">getsystm.com › knowledge › {d.slug || '…'}</small>
          <b>{(d.seoTitle || d.title || 'כותרת המדריך').slice(0, 70)}</b>
          <span>{(d.seoDescription || d.summary || 'התיאור יופיע כאן.').slice(0, 165)}</span>
        </div>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>מילת מפתח ראשית</span>
            <input className="ad-input" value={d.focusKeyword ?? ''} onChange={(e) => set('focusKeyword', e.target.value)} maxLength={80} placeholder="אוטומציה לעסקים קטנים" />
          </label>
          <label className="ad-field">
            <span>תמונה לשיתוף (og:image)</span>
            <input className="ad-input ltr" dir="ltr" value={d.ogImage ?? ''} onChange={(e) => set('ogImage', e.target.value)} placeholder="https://…" />
          </label>
        </div>
        <label className="ad-field">
          <span>כותרת לגוגל</span>
          <input className="ad-input" value={d.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} maxLength={120} placeholder={d.title} />
          <Counter value={d.seoTitle ?? ''} max={60} />
        </label>
        <label className="ad-field">
          <span>תיאור לגוגל</span>
          <textarea className="ad-textarea" rows={2} value={d.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value)} maxLength={320} placeholder={d.summary} />
          <Counter value={d.seoDescription ?? ''} max={160} />
        </label>
        <ul className="seo-checks">
          {checks.map((c) => (
            <li key={c.id} data-ok={c.ok}>
              <span aria-hidden="true">{c.ok ? '✓' : '○'}</span>
              <div>
                {c.label}
                {c.ok ? null : <small>{c.tip}</small>}
              </div>
            </li>
          ))}
        </ul>
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
