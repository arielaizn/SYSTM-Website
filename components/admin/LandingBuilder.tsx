'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { pageDelete, pageSave, type PageInput } from '../../app/admin/actions';
import { BLOCK_LABELS, BLOCK_TYPES, newBlock, pageText, startBlocks, TEMPLATES, uid, type AnyBlock, type BlockStyle, type BlockType } from '../../lib/landing';
import { landingChecks, seoScore } from '../../lib/seo-score';
import { BlockView } from '../landing/BlockView';
import { Counter, useUnsavedGuard } from './editors';
import { Icon } from './Icon';
import { RichEditor } from './RichEditor';
import { useAct, useAdmin } from './ui';
import { Select } from '../ui/Select';

export type PageDraft = Omit<PageInput, 'blocks'> & { blocks: AnyBlock[] };
export const EMPTY_PAGE: PageDraft = { slug: '', title: '', status: 'draft', blocks: [] };

type Device = 'desktop' | 'tablet' | 'mobile';
type Field = { key: string; label: string; kind?: 'text' | 'textarea' | 'url' | 'number'; options?: { v: string; l: string }[] };

const FIELDS: Partial<Record<BlockType, Field[]>> = {
  hero: [
    { key: 'eyebrow', label: 'שורת פתיחה קטנה' }, { key: 'title', label: 'כותרת' }, { key: 'subtitle', label: 'כותרת משנה', kind: 'textarea' },
    { key: 'ctaLabel', label: 'טקסט כפתור ראשי' }, { key: 'ctaHref', label: 'קישור כפתור ראשי', kind: 'url' },
    { key: 'secondaryLabel', label: 'טקסט כפתור משני' }, { key: 'secondaryHref', label: 'קישור כפתור משני', kind: 'url' },
    { key: 'image', label: 'תמונה (https://…)', kind: 'url' },
  ],
  features: [{ key: 'title', label: 'כותרת' }, { key: 'intro', label: 'פסקת פתיחה', kind: 'textarea' }, { key: 'columns', label: 'עמודות', options: [{ v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }] }],
  steps: [{ key: 'title', label: 'כותרת' }],
  image: [{ key: 'src', label: 'כתובת תמונה (https://…)', kind: 'url' }, { key: 'alt', label: 'טקסט חלופי (alt)' }, { key: 'caption', label: 'כיתוב' }],
  video: [{ key: 'url', label: 'קישור יוטיוב', kind: 'url' }, { key: 'caption', label: 'כיתוב' }],
  testimonials: [{ key: 'title', label: 'כותרת' }],
  faq: [{ key: 'title', label: 'כותרת' }],
  cta: [{ key: 'title', label: 'כותרת' }, { key: 'text', label: 'טקסט', kind: 'textarea' }, { key: 'label', label: 'טקסט כפתור' }, { key: 'href', label: 'קישור', kind: 'url' }],
  form: [{ key: 'title', label: 'כותרת' }, { key: 'text', label: 'טקסט', kind: 'textarea' }, { key: 'button', label: 'טקסט כפתור' }, { key: 'service', label: 'כיוון הפנייה', options: [{ v: 'not-sure', l: 'רוצה להבין מה מתאים' }, { v: 'ai-agents', l: 'סוכני AI' }, { v: 'automation', l: 'אוטומציות' }, { v: 'consulting', l: 'ייעוץ' }, { v: 'workshops', l: 'הדרכות' }, { v: 'claude-code', l: 'Claude Code' }] }],
  spacer: [{ key: 'height', label: 'גובה (px)', kind: 'number' }],
};

const ITEMS: Partial<Record<BlockType, { fields: Field[]; blank: Record<string, string> }>> = {
  features: { fields: [{ key: 'title', label: 'כותרת' }, { key: 'text', label: 'טקסט', kind: 'textarea' }], blank: { title: '', text: '' } },
  steps: { fields: [{ key: 'title', label: 'כותרת' }, { key: 'text', label: 'טקסט', kind: 'textarea' }], blank: { title: '', text: '' } },
  stats: { fields: [{ key: 'value', label: 'מספר' }, { key: 'label', label: 'תווית' }], blank: { value: '', label: '' } },
  testimonials: { fields: [{ key: 'quote', label: 'ציטוט', kind: 'textarea' }, { key: 'name', label: 'שם' }, { key: 'role', label: 'תפקיד' }], blank: { quote: '', name: '', role: '' } },
  faq: { fields: [{ key: 'q', label: 'שאלה' }, { key: 'a', label: 'תשובה', kind: 'textarea' }], blank: { q: '', a: '' } },
};

const move = <T,>(a: T[], from: number, to: number) => {
  const c = a.slice();
  const [x] = c.splice(from, 1);
  c.splice(to, 0, x);
  return c;
};

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: string | number) => void }) {
  const v = String(value ?? '');
  return (
    <label className="ad-field">
      <span>{f.label}</span>
      {f.options ? (
        <Select value={v} aria-label={f.label} onChange={(x) => onChange(f.key === 'columns' ? Number(x) : x)} options={f.options.map((o) => ({ value: o.v, label: o.l }))} />
      ) : f.kind === 'textarea' ? (
        <textarea className="ad-textarea" rows={3} value={v} onChange={(e) => onChange(e.target.value)} />
      ) : f.kind === 'number' ? (
        <input className="ad-input" type="number" min={8} max={240} value={v} onChange={(e) => onChange(Number(e.target.value))} />
      ) : (
        <input className={`ad-input${f.kind === 'url' ? ' ltr' : ''}`} dir={f.kind === 'url' ? 'ltr' : undefined} value={v} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Segment<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="lb-seg" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((o) => (
          <button key={o.v} type="button" data-on={value === o.v || undefined} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

export function LandingBuilder({ id, initial }: { id: string | null; initial: PageDraft }) {
  const router = useRouter();
  const { confirm } = useAdmin();
  const { act, pending } = useAct();
  const [d, setD] = useState<PageDraft>(initial);
  const [saved, setSaved] = useState(initial);
  const [sel, setSel] = useState<string | null>(initial.blocks[0]?.id ?? null);
  const [device, setDevice] = useState<Device>('desktop');
  const [tab, setTab] = useState<'block' | 'page'>('block');
  const [picker, setPicker] = useState(!id && initial.blocks.length === 0);
  const [drop, setDrop] = useState<number | null>(null);
  const past = useRef<PageDraft[]>([]);
  const future = useRef<PageDraft[]>([]);
  const lastPush = useRef(0);
  const [, force] = useState(0);

  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(saved), [d, saved]);
  useUnsavedGuard(dirty);

  /** Every edit goes through here so undo/redo works. Edits within 700ms are coalesced into one step (typing). */
  const commit = useCallback((next: PageDraft | ((p: PageDraft) => PageDraft)) => {
    setD((p) => {
      const n = typeof next === 'function' ? next(p) : next;
      const now = Date.now();
      if (now - lastPush.current > 700) past.current = [...past.current.slice(-59), p];
      lastPush.current = now;
      future.current = [];
      return n;
    });
  }, []);
  const undo = () => setD((p) => { const prev = past.current.pop(); if (!prev) return p; future.current.push(p); lastPush.current = 0; force((n) => n + 1); return prev; });
  const redo = () => setD((p) => { const nx = future.current.pop(); if (!nx) return p; past.current.push(p); lastPush.current = 0; force((n) => n + 1); return nx; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement)?.closest('input,textarea,[contenteditable]')) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? redo : undo)(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const blocks = d.blocks;
  const idx = blocks.findIndex((b) => b.id === sel);
  const current = idx >= 0 ? blocks[idx] : null;
  const setBlocks = (fn: (b: AnyBlock[]) => AnyBlock[]) => commit((p) => ({ ...p, blocks: fn(p.blocks) }));
  const patchBlock = (bid: string, fn: (b: AnyBlock) => AnyBlock) => setBlocks((bs) => bs.map((b) => (b.id === bid ? fn(b) : b)));
  const setProp = (bid: string, key: string, v: unknown) => patchBlock(bid, (b) => ({ ...b, props: { ...(b.props as object), [key]: v } }) as AnyBlock);
  const setStyle = (bid: string, patch: Partial<BlockStyle>) => patchBlock(bid, (b) => ({ ...b, style: { ...b.style, ...patch } }));

  const insert = (type: BlockType, at?: number) => {
    const b = newBlock(type) as AnyBlock;
    setBlocks((bs) => { const i = at ?? (idx >= 0 ? idx + 1 : bs.length); return [...bs.slice(0, i), b, ...bs.slice(i)]; });
    setSel(b.id);
    setTab('block');
  };
  const duplicate = (bid: string) => {
    const i = blocks.findIndex((b) => b.id === bid);
    if (i < 0) return;
    const copy = { ...structuredClone(blocks[i]), id: uid() } as AnyBlock;
    setBlocks((bs) => [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)]);
    setSel(copy.id);
  };
  const remove = (bid: string) => { setBlocks((bs) => bs.filter((b) => b.id !== bid)); setSel(null); };

  function onDropAt(e: DragEvent, at: number) {
    e.preventDefault();
    const nt = e.dataTransfer.getData('application/x-lp-new') as BlockType;
    const mv = e.dataTransfer.getData('application/x-lp-move');
    setDrop(null);
    if (BLOCK_TYPES.includes(nt)) insert(nt, at);
    else if (mv) {
      const from = blocks.findIndex((b) => b.id === mv);
      if (from >= 0) setBlocks((bs) => move(bs, from, at > from ? at - 1 : at));
    }
  }
  const over = (e: DragEvent, at: number) => { e.preventDefault(); setDrop(at); };

  async function save(status: 'draft' | 'published') {
    const data: PageDraft = { ...d, status };
    const r = await act(() => pageSave(id, data), status === 'published' ? 'הדף פורסם' : 'נשמר כטיוטה');
    if (!r.ok) return;
    setD(data);
    setSaved(data);
    if (!id) router.replace(`/admin/pages/${r.data}`);
    else router.refresh();
  }
  async function del() {
    if (!id || !(await confirm({ title: `למחוק את "${d.title}"?`, text: 'אי אפשר לשחזר.', confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => pageDelete(id), 'נמחק');
    if (r.ok) router.replace('/admin/pages');
  }

  const checks = useMemo(() => landingChecks({ title: d.title, slug: d.slug, seoTitle: d.seoTitle, seoDescription: d.seoDescription, text: pageText(blocks), blocks: blocks.filter((b) => !b.hidden).map((b) => ({ type: b.type, props: b.props as Record<string, unknown> })) }), [d, blocks]);
  const score = seoScore(checks);
  const itemSpec = current ? ITEMS[current.type] : undefined;
  const items = current && itemSpec ? ((current.props as unknown as { items: Record<string, string>[] }).items ?? []) : [];

  return (
    <div className="lb">
      {picker ? (
        <div className="lb-modal" role="dialog" aria-modal="true" aria-label="בחירת תבנית">
          <div className="lb-modal__box">
            <h2>מאיפה מתחילים?</h2>
            <div className="lb-templates">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="lb-tpl" onClick={() => { const b = startBlocks(t.id); commit({ ...d, blocks: b, title: d.title || (t.id === 'blank' ? '' : t.label) }); setSel(b[0]?.id ?? null); setPicker(false); }}>
                  <b>{t.label}</b>
                  <span>{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="lb-top">
        <input className="ad-input lb-title" value={d.title} onChange={(e) => commit({ ...d, title: e.target.value })} placeholder="שם הדף" maxLength={200} aria-label="שם הדף" />
        <div className="lb-slug" dir="ltr">
          <span>/lp/</span>
          <input className="ad-input" value={d.slug} onChange={(e) => commit({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="my-page" maxLength={60} aria-label="כתובת הדף" />
          <span>/</span>
        </div>
        <div className="lb-devices" role="group" aria-label="תצוגה מקדימה">
          {(['desktop', 'tablet', 'mobile'] as const).map((x) => (
            <button key={x} type="button" data-on={device === x || undefined} aria-pressed={device === x} onClick={() => setDevice(x)}>{x === 'desktop' ? 'מחשב' : x === 'tablet' ? 'טאבלט' : 'נייד'}</button>
          ))}
        </div>
        <div className="ad-actions">
          <button type="button" className="ad-btn ad-btn--sm" onClick={undo} disabled={!past.current.length} aria-label="ביטול">↶</button>
          <button type="button" className="ad-btn ad-btn--sm" onClick={redo} disabled={!future.current.length} aria-label="שחזור">↷</button>
          <button type="button" className="ad-btn ad-btn--sm" onClick={() => setPicker(true)}>תבניות</button>
          {id && saved.status === 'published' ? <a className="ad-btn ad-btn--sm" href={`/lp/${d.slug}/`} target="_blank" rel="noopener noreferrer"><Icon name="eye" /> צפייה</a> : null}
          {id ? <button type="button" className="ad-btn ad-btn--sm ad-btn--danger ad-btn--icon" onClick={del} aria-label="מחיקת הדף"><Icon name="trash" /></button> : null}
          <button type="button" className="ad-btn ad-btn--sm" disabled={pending || !d.title.trim() || !d.slug} onClick={() => save('draft')}>שמירה כטיוטה</button>
          <button type="button" className="ad-btn ad-btn--sm ad-btn--primary" disabled={pending || !d.title.trim() || !d.slug} aria-busy={pending} onClick={() => save('published')}>{saved.status === 'published' && id ? 'שמירה ופרסום' : 'פרסום'}</button>
        </div>
      </div>

      <div className="lb-main">
        <aside className="lb-palette" aria-label="בלוקים">
          <h3>הוספת בלוק</h3>
          <p>לחיצה מוסיפה אחרי הבלוק הנבחר. אפשר גם לגרור לקנבס.</p>
          <div>
            {BLOCK_TYPES.map((t) => (
              <button key={t} type="button" draggable onDragStart={(e) => e.dataTransfer.setData('application/x-lp-new', t)} onClick={() => insert(t)}>
                <Icon name="plus" /> {BLOCK_LABELS[t]}
              </button>
            ))}
          </div>
          <h3>שכבות</h3>
          <ol className="lb-layers">
            {blocks.map((b, i) => (
              <li key={b.id} data-on={b.id === sel || undefined} data-off={b.hidden || undefined}>
                <button type="button" onClick={() => { setSel(b.id); setTab('block'); document.getElementById(`lb-${b.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}>{i + 1}. {BLOCK_LABELS[b.type]}</button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="lb-stage" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null); }}>
          <div className="lb-frame" data-device={device}>
            <div className="lp" onDragOver={(e) => over(e, blocks.length)} onDrop={(e) => onDropAt(e, blocks.length)}>
              {blocks.length === 0 ? <div className="lb-empty"><b>הדף ריק</b><span>גררו לכאן בלוק או בחרו תבנית.</span></div> : null}
              {blocks.map((b, i) => (
                <div key={b.id} id={`lb-${b.id}`} className="lb-wrap" data-on={b.id === sel || undefined} data-drop={drop === i || undefined} onClick={() => { setSel(b.id); setTab('block'); }} onDragOver={(e) => over(e, e.nativeEvent.offsetY < e.currentTarget.clientHeight / 2 ? i : i + 1)} onDrop={(e) => onDropAt(e, e.nativeEvent.offsetY < e.currentTarget.clientHeight / 2 ? i : i + 1)}>
                  <div className="lb-tools" onClick={(e) => e.stopPropagation()}>
                    <span className="lb-handle" draggable onDragStart={(e) => e.dataTransfer.setData('application/x-lp-move', b.id)} title="גרירה" aria-label="גרירה">⋮⋮</span>
                    <b>{BLOCK_LABELS[b.type]}</b>
                    <button type="button" aria-label="למעלה" disabled={i === 0} onClick={() => setBlocks((bs) => move(bs, i, i - 1))}><Icon name="up" /></button>
                    <button type="button" aria-label="למטה" disabled={i === blocks.length - 1} onClick={() => setBlocks((bs) => move(bs, i, i + 1))}><Icon name="down" /></button>
                    <button type="button" aria-label="שכפול" onClick={() => duplicate(b.id)}><Icon name="copy" /></button>
                    <button type="button" aria-label={b.hidden ? 'הצגה' : 'הסתרה'} onClick={() => patchBlock(b.id, (x) => ({ ...x, hidden: x.hidden ? undefined : true }))}><Icon name="eye" /></button>
                    <button type="button" aria-label="מחיקה" onClick={() => remove(b.id)}><Icon name="trash" /></button>
                  </div>
                  <BlockView block={b} slug={d.slug || 'preview'} preview />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lb-props">
          <div className="lb-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'block'} data-on={tab === 'block' || undefined} onClick={() => setTab('block')}>בלוק</button>
            <button type="button" role="tab" aria-selected={tab === 'page'} data-on={tab === 'page' || undefined} onClick={() => setTab('page')}>דף ו־SEO <i>{score}</i></button>
          </div>

          {tab === 'block' ? (
            current ? (
              <div className="lb-panel" key={current.id}>
                <h3>{BLOCK_LABELS[current.type]}</h3>
                {current.type === 'text' ? <RichEditor value={(current.props as { html: string }).html} onChange={(h) => setProp(current.id, 'html', h)} /> : null}
                {(FIELDS[current.type] ?? []).map((f) => <FieldInput key={f.key} f={f} value={(current.props as unknown as Record<string, unknown>)[f.key]} onChange={(v) => setProp(current.id, f.key, v)} />)}
                {itemSpec ? (
                  <div className="lb-items">
                    <h4>פריטים ({items.length})</h4>
                    {items.map((it, i) => (
                      <div className="lb-item" key={i}>
                        <div className="lb-item__head">
                          <span>{i + 1}</span>
                          <button type="button" disabled={i === 0} aria-label="למעלה" onClick={() => setProp(current.id, 'items', move(items, i, i - 1))}><Icon name="up" /></button>
                          <button type="button" disabled={i === items.length - 1} aria-label="למטה" onClick={() => setProp(current.id, 'items', move(items, i, i + 1))}><Icon name="down" /></button>
                          <button type="button" aria-label="מחיקה" onClick={() => setProp(current.id, 'items', items.filter((_, k) => k !== i))}><Icon name="trash" /></button>
                        </div>
                        {itemSpec.fields.map((f) => <FieldInput key={f.key} f={f} value={it[f.key]} onChange={(v) => setProp(current.id, 'items', items.map((x, k) => (k === i ? { ...x, [f.key]: v } : x)))} />)}
                      </div>
                    ))}
                    <button type="button" className="ad-btn ad-btn--sm" onClick={() => setProp(current.id, 'items', [...items, { ...itemSpec.blank }])}><Icon name="plus" /> פריט</button>
                  </div>
                ) : null}
                <h4>עיצוב הבלוק</h4>
                <Segment label="רקע" value={current.style.surface} onChange={(v) => setStyle(current.id, { surface: v })} options={[{ v: 'none', l: 'ללא' }, { v: 'glass', l: 'זכוכית' }, { v: 'ice', l: 'קרח' }, { v: 'dark', l: 'כהה' }]} />
                <Segment label="ריווח אנכי" value={current.style.padY} onChange={(v) => setStyle(current.id, { padY: v })} options={[{ v: 'sm', l: 'קטן' }, { v: 'md', l: 'בינוני' }, { v: 'lg', l: 'גדול' }]} />
                <Segment label="יישור" value={current.style.align} onChange={(v) => setStyle(current.id, { align: v })} options={[{ v: 'start', l: 'התחלה' }, { v: 'center', l: 'מרכז' }]} />
                <Segment label="רוחב" value={current.style.width} onChange={(v) => setStyle(current.id, { width: v })} options={[{ v: 'narrow', l: 'צר' }, { v: 'normal', l: 'רגיל' }, { v: 'wide', l: 'רחב' }]} />
                <Segment label="הסתרה במכשיר" value={current.style.hideOn} onChange={(v) => setStyle(current.id, { hideOn: v })} options={[{ v: '', l: 'תמיד מוצג' }, { v: 'mobile', l: 'בנייד' }, { v: 'desktop', l: 'במחשב' }]} />
                <label className="ad-field">
                  <span>עוגן (anchor) לקישורים כמו #lead</span>
                  <input className="ad-input ltr" dir="ltr" value={current.style.anchor} onChange={(e) => setStyle(current.id, { anchor: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} maxLength={40} placeholder="lead" />
                </label>
              </div>
            ) : (
              <p className="lb-hint">בחרו בלוק בקנבס כדי לערוך אותו.</p>
            )
          ) : (
            <div className="lb-panel">
              <h3>הגדרות הדף</h3>
              <label className="ad-field">
                <span>כותרת לגוגל</span>
                <input className="ad-input" value={d.seoTitle ?? ''} onChange={(e) => commit({ ...d, seoTitle: e.target.value })} maxLength={120} placeholder={d.title} />
                <Counter value={d.seoTitle ?? ''} max={60} />
              </label>
              <label className="ad-field">
                <span>תיאור לגוגל</span>
                <textarea className="ad-textarea" rows={3} value={d.seoDescription ?? ''} onChange={(e) => commit({ ...d, seoDescription: e.target.value })} maxLength={320} />
                <Counter value={d.seoDescription ?? ''} max={160} />
              </label>
              <label className="ad-field">
                <span>תמונה לשיתוף (og:image)</span>
                <input className="ad-input ltr" dir="ltr" value={d.ogImage ?? ''} onChange={(e) => commit({ ...d, ogImage: e.target.value })} placeholder="https://…" />
              </label>
              <label className="ad-switch-row">
                <input type="checkbox" checked={!!d.noindex} onChange={(e) => commit({ ...d, noindex: e.target.checked })} />
                <span>לא להציג בגוגל (noindex), למשל דף לקמפיין ממומן בלבד</span>
              </label>
              <h4>בדיקות SEO · ציון {score}</h4>
              <ul className="seo-checks">
                {checks.map((c) => (
                  <li key={c.id} data-ok={c.ok}><span aria-hidden="true">{c.ok ? '✓' : '○'}</span><div>{c.label}{c.ok ? null : <small>{c.tip}</small>}</div></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <p className="lb-foot">{dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'} · <Link href="/admin/pages">חזרה לרשימה</Link></p>
    </div>
  );
}

