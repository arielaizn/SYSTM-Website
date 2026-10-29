'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leadAddNote, leadBulk, leadCreate, leadDelete, leadsCsv, leadUpdate } from '../../app/admin/actions';
import type { Doc } from '../../convex/_generated/dataModel';
import { Select } from '../ui/Select';
import { Icon } from './Icon';
import { MobileLeads } from './MobileLeads';
import { Drawer, fmtDate, STATUS_LABEL, STATUSES, timeAgo, useAct, useAdmin } from './ui';

type Lead = Doc<'leads'>;
type Status = (typeof STATUSES)[number];
type Props = { initial: Lead[]; labels: Record<string, string>; choices: { value: string; label: string }[]; initialStatus: string; openId?: string };

const BOARD: Status[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

const waDigits = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? `972${d.slice(1)}` : d;
};

export function LeadsView({ initial, labels, choices, initialStatus, openId }: Props) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const { act, pending } = useAct();
  const [leads, setLeads] = useState(initial);
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'table' | 'board'>('table');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const [adding, setAdding] = useState(false);

  useEffect(() => setLeads(initial), [initial]);

  // New leads appear without a manual reload: refresh the server data every 30s while the tab is visible.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1;
      if (l.status !== 'spam') c.all++;
    }
    return c;
  }, [leads]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (status === 'all' ? l.status === 'spam' : l.status !== status) return false;
      if (!needle) return true;
      return `${l.name} ${l.phone} ${l.email} ${l.company} ${l.message} ${l.tags.join(' ')} ${l.notes.map((n) => n.text).join(' ')}`.toLowerCase().includes(needle);
    });
  }, [leads, status, q]);

  const patchLocal = useCallback((id: string, patch: Partial<Lead>) => setLeads((all) => all.map((l) => (l._id === id ? { ...l, ...patch, updatedAt: Date.now() } : l))), []);

  async function setLeadStatus(id: string, next: Status) {
    const prev = leads.find((l) => l._id === id);
    if (!prev || prev.status === next) return;
    patchLocal(id, { status: next, ...(next !== 'new' && next !== 'spam' && !prev.contactedAt ? { contactedAt: Date.now() } : {}) });
    const r = await act(() => leadUpdate(id, { status: next }));
    if (!r.ok) router.refresh();
  }

  async function bulkStatus(next: Status) {
    const ids = [...sel];
    ids.forEach((id) => patchLocal(id, { status: next }));
    setSel(new Set());
    const r = await act(() => leadBulk(ids, 'status', next), `${ids.length} לידים עודכנו`);
    if (!r.ok) router.refresh();
  }

  async function bulkDelete() {
    const ids = [...sel];
    if (!(await confirm({ title: `למחוק ${ids.length} לידים?`, text: 'אי אפשר לשחזר. אם רק רוצים להסתיר, עדיף לסמן כספאם.', confirm: 'מחיקה', danger: true }))) return;
    setLeads((all) => all.filter((l) => !sel.has(l._id)));
    setSel(new Set());
    const r = await act(() => leadBulk(ids, 'delete'), 'נמחקו');
    if (!r.ok) router.refresh();
  }

  async function exportCsv() {
    const r = await act(() => leadsCsv());
    if (!r.ok) return;
    const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `leads-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast('הקובץ ירד');
  }

  const allShown = rows.length > 0 && rows.every((l) => sel.has(l._id));
  const current = open ? leads.find((l) => l._id === open) ?? null : null;

  return (
    <>
      <div className="ad-toolbar">
        <div className="ad-tabs" role="tablist" aria-label="סינון לפי סטטוס">
          <button role="tab" type="button" className="ad-tab" aria-selected={status === 'all'} onClick={() => setStatus('all')}>
            הכול <b>{counts.all}</b>
          </button>
          {STATUSES.filter((s) => s !== 'spam').map((s) => (
            <button key={s} role="tab" type="button" className="ad-tab" aria-selected={status === s} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]} <b>{counts[s] ?? 0}</b>
            </button>
          ))}
          <button role="tab" type="button" className="ad-tab" aria-selected={status === 'spam'} onClick={() => setStatus('spam')}>
            ספאם <b>{counts.spam ?? 0}</b>
          </button>
        </div>
      </div>
      <div className="ad-toolbar">
        <label className="ad-search">
          <Icon name="search" />
          <span className="sr-only">חיפוש בלידים</span>
          <input className="ad-input" type="search" placeholder="חיפוש לפי שם, טלפון, הודעה או תגית" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="ad-tabs" role="group" aria-label="תצוגה">
          <button type="button" className="ad-tab" aria-selected={view === 'table'} onClick={() => setView('table')}>
            <Icon name="table" width={16} height={16} /> טבלה
          </button>
          <button type="button" className="ad-tab" aria-selected={view === 'board'} onClick={() => setView('board')}>
            <Icon name="board" width={16} height={16} /> לוח
          </button>
        </div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="ad-btn ad-btn--sm" onClick={exportCsv} disabled={pending}>
            <Icon name="download" /> ייצוא CSV
          </button>
          <button type="button" className="ad-btn ad-btn--sm ad-btn--primary" onClick={() => setAdding(true)}>
            <Icon name="plus" /> ליד ידני
          </button>
        </div>
      </div>

      {sel.size > 0 ? (
        <div className="ad-bulk" role="region" aria-label="פעולות על הנבחרים">
          <b>{sel.size} נבחרו</b>
          <Select style={{ width: 190, minHeight: 36 }} value="" placeholder="שינוי סטטוס…" aria-label="שינוי סטטוס לנבחרים" onChange={(v) => bulkStatus(v as Status)} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          <button type="button" className="ad-btn ad-btn--sm ad-btn--danger" onClick={bulkDelete}>
            <Icon name="trash" /> מחיקה
          </button>
          <button type="button" className="ad-btn ad-btn--sm ad-btn--ghost" onClick={() => setSel(new Set())}>
            ביטול בחירה
          </button>
        </div>
      ) : null}

      {rows.length === 0 && !(view === 'board') ? (
        <div className="ad-card ad-empty">
          <Icon name="inbox" width={30} height={30} />
          <b>{leads.length === 0 ? 'עוד אין פניות' : 'אין תוצאות'}</b>
          <span>{leads.length === 0 ? 'פניות מהטופס באתר יופיעו כאן אוטומטית. אפשר גם להוסיף ליד ידנית.' : 'נסו סטטוס אחר או חיפוש אחר.'}</span>
        </div>
      ) : view === 'table' ? (
        <>
        <MobileLeads rows={rows} labels={labels} onOpen={setOpen} onContacted={(id) => setLeadStatus(id, 'contacted')} />
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input type="checkbox" className="ad-check" aria-label="בחירת כל הלידים המוצגים" checked={allShown} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((l) => l._id)) : new Set())} />
                </th>
                <th>שם</th>
                <th>טלפון</th>
                <th>שירות</th>
                <th>סטטוס</th>
                <th>תגיות</th>
                <th>התקבל</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l._id} aria-selected={sel.has(l._id) || undefined} onClick={() => setOpen(l._id)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="ad-check" aria-label={`בחירת ${l.name}`} checked={sel.has(l._id)} onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(l._id) : n.delete(l._id); return n; })} />
                  </td>
                  <td>
                    <span className="ad-cell-strong">{l.name}</span>
                    {l.company ? <small>{l.company}</small> : null}
                  </td>
                  <td dir="ltr" style={{ textAlign: 'start' }}>{l.phone}</td>
                  <td>{labels[l.service] ?? l.service}</td>
                  <td>
                    <span className="ad-badge" data-s={l.status}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td>
                    {l.tags.slice(0, 2).map((t) => (
                      <span key={t} className="ad-tag" data-warn={t === 'כפילות' || undefined} style={{ marginInlineEnd: 4 }}>
                        {t}
                      </span>
                    ))}
                  </td>
                  <td title={fmtDate(l.createdAt)} suppressHydrationWarning>{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <Board leads={leads} q={q} labels={labels} onOpen={setOpen} onMove={setLeadStatus} />
      )}

      <Drawer open={!!current} onClose={() => setOpen(null)} label="פרטי ליד">
        {current ? (
          <LeadDetail
            key={current._id}
            lead={current}
            labels={labels}
            choices={choices}
            onClose={() => setOpen(null)}
            onPatch={(p) => patchLocal(current._id, p)}
            onDeleted={() => {
              setLeads((all) => all.filter((l) => l._id !== current._id));
              setOpen(null);
            }}
            onStatus={(s) => setLeadStatus(current._id, s)}
          />
        ) : null}
      </Drawer>

      <AddLead open={adding} onClose={() => setAdding(false)} choices={choices} onDone={() => router.refresh()} />
    </>
  );
}

function Board({ leads, q, labels, onOpen, onMove }: { leads: Lead[]; q: string; labels: Record<string, string>; onOpen: (id: string) => void; onMove: (id: string, s: Status) => void }) {
  const [over, setOver] = useState<Status | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  const match = (l: Lead) => !needle || `${l.name} ${l.phone} ${l.company} ${l.message}`.toLowerCase().includes(needle);
  return (
    <div className="ad-board">
      {BOARD.map((s) => {
        const col = leads.filter((l) => l.status === s && match(l));
        return (
          <section
            key={s}
            className="ad-col"
            data-over={over === s}
            aria-label={STATUS_LABEL[s]}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMove(id, s);
            }}
          >
            <h3>
              <span className="ad-badge" data-s={s}>
                {STATUS_LABEL[s]}
              </span>
              <span>{col.length}</span>
            </h3>
            {col.map((l) => (
              <article
                key={l._id}
                className="ad-card-lead"
                data-drag={drag === l._id}
                draggable
                tabIndex={0}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', l._id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDrag(l._id);
                }}
                onDragEnd={() => setDrag(null)}
                onClick={() => onOpen(l._id)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(l._id)}
              >
                <b>{l.name}</b>
                <small>{labels[l.service] ?? l.service}</small>
                <small suppressHydrationWarning>{timeAgo(l.createdAt)}</small>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function LeadDetail({ lead, labels, choices, onClose, onPatch, onDeleted, onStatus }: { lead: Lead; labels: Record<string, string>; choices: { value: string; label: string }[]; onClose: () => void; onPatch: (p: Partial<Lead>) => void; onDeleted: () => void; onStatus: (s: Status) => void }) {
  const { act } = useAct();
  const { toast, confirm } = useAdmin();
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [form, setForm] = useState({ name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, service: lead.service });
  const first = lead.name.split(' ')[0];
  const wa = `https://wa.me/${waDigits(lead.phone)}?text=${encodeURIComponent(`היי ${first}, כאן אריאל מ־SYSTM. קיבלתי את הפנייה שלך על ${labels[lead.service] ?? 'הנושא'}. מתי נוח לך לדבר?`)}`;
  const dirty = form.name !== lead.name || form.phone !== lead.phone || form.email !== lead.email || form.company !== lead.company || form.service !== lead.service;

  async function saveDetails() {
    const r = await act(() => leadUpdate(lead._id, form), 'נשמר');
    if (r.ok) onPatch(form);
  }

  async function addNote() {
    const text = note.trim();
    if (!text) return;
    const r = await act(() => leadAddNote(lead._id, text));
    if (r.ok) {
      onPatch({ notes: [...lead.notes, { at: Date.now(), text }] });
      setNote('');
    }
  }

  async function setTags(tags: string[]) {
    const r = await act(() => leadUpdate(lead._id, { tags }));
    if (r.ok) onPatch({ tags });
  }

  async function addTag() {
    const t = tag.trim().slice(0, 30);
    if (!t || lead.tags.includes(t)) return setTag('');
    setTag('');
    await setTags([...lead.tags, t]);
  }

  async function remove() {
    if (!(await confirm({ title: 'למחוק את הליד?', text: `${lead.name} יימחק לצמיתות.`, confirm: 'מחיקה', danger: true }))) return;
    const r = await act(() => leadDelete(lead._id), 'הליד נמחק');
    if (r.ok) onDeleted();
  }

  return (
    <>
      <div className="ad-drawer__head">
        <div>
          <h2>{lead.name}</h2>
          <p style={{ color: 'var(--ad-muted)', fontSize: 13 }}>
            {labels[lead.service] ?? lead.service} · {fmtDate(lead.createdAt)} · {lead.source === 'manual' ? 'ידני' : 'מהאתר'}
          </p>
        </div>
        <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="סגירה" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="ad-row">
        <div className="ad-actions">
          <a className="ad-btn ad-btn--primary" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" /> וואטסאפ
          </a>
          <a className="ad-btn" href={`tel:${lead.phone}`}>
            <Icon name="phone" /> התקשרות
          </a>
          {lead.email ? (
            <a className="ad-btn" href={`mailto:${lead.email}`}>
              <Icon name="mail" /> אימייל
            </a>
          ) : null}
          <button
            type="button"
            className="ad-btn ad-btn--icon"
            aria-label="העתקת טלפון"
            onClick={() => navigator.clipboard?.writeText(lead.phone).then(() => toast('הטלפון הועתק'), () => toast('אי אפשר להעתיק מהדפדפן הזה', 'error'))}
          >
            <Icon name="copy" />
          </button>
        </div>

        <label className="ad-field">
          <span>סטטוס</span>
          <Select aria-label="סטטוס" value={lead.status} onChange={(v) => onStatus(v as Status)} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        </label>

        {lead.message ? (
          <div className="ad-field">
            <span>מה כתבו</span>
            <p className="ad-msg">{lead.message}</p>
          </div>
        ) : null}

        <div className="ad-card" style={{ padding: 16, background: '#0b1317', display: 'grid', gap: 12 }}>
          <div className="ad-row ad-row--2">
            <label className="ad-field">
              <span>שם</span>
              <input className="ad-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </label>
            <label className="ad-field">
              <span>טלפון</span>
              <input className="ad-input ltr" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </label>
            <label className="ad-field">
              <span>אימייל</span>
              <input className="ad-input ltr" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={180} />
            </label>
            <label className="ad-field">
              <span>עסק</span>
              <input className="ad-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
            </label>
          </div>
          <label className="ad-field">
            <span>כיוון הפנייה</span>
            <Select aria-label="כיוון הפנייה" value={form.service} onChange={(v) => setForm({ ...form, service: v })} options={[...choices.map((c) => ({ value: c.value, label: c.label })), ...(choices.some((c) => c.value === form.service) ? [] : [{ value: form.service, label: form.service }])]} />
          </label>
          {dirty ? (
            <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" style={{ justifySelf: 'start' }} onClick={saveDetails}>
              שמירת שינויים
            </button>
          ) : null}
        </div>

        <div className="ad-field">
          <span>תגיות</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {lead.tags.map((t) => (
              <span key={t} className="ad-tag" data-warn={t === 'כפילות' || undefined}>
                {t}
                <button type="button" aria-label={`הסרת התגית ${t}`} onClick={() => setTags(lead.tags.filter((x) => x !== t))}>
                  <Icon name="close" />
                </button>
              </span>
            ))}
            <input className="ad-input" style={{ width: 150, minHeight: 32, padding: '4px 10px', fontSize: 13 }} placeholder="תגית חדשה" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} maxLength={30} />
          </div>
        </div>

        <div className="ad-field">
          <span>הערות פנימיות</span>
          <div className="ad-notes">
            {lead.notes.length === 0 ? <small>אין הערות עדיין.</small> : null}
            {lead.notes.map((n) => (
              <div className="ad-note" key={n.at}>
                <small>{fmtDate(n.at)}</small>
                <p>{n.text}</p>
              </div>
            ))}
          </div>
          <textarea className="ad-textarea" rows={3} placeholder="מה דיברתם? מה הצעד הבא?" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          <button type="button" className="ad-btn ad-btn--sm" style={{ justifySelf: 'start' }} disabled={!note.trim()} onClick={addNote}>
            הוספת הערה
          </button>
        </div>

        <dl className="ad-kv" style={{ color: 'var(--ad-muted)' }}>
          <dt>התקבל</dt>
          <dd>{fmtDate(lead.createdAt)}</dd>
          <dt>מענה ראשון</dt>
          <dd>{lead.contactedAt ? `${fmtDate(lead.contactedAt)} (אחרי ${Math.max(1, Math.round((lead.contactedAt - lead.createdAt) / 3_600_000))} שעות)` : 'עדיין לא'}</dd>
        </dl>

        <button type="button" className="ad-btn ad-btn--danger" style={{ justifySelf: 'start' }} onClick={remove}>
          <Icon name="trash" /> מחיקת הליד
        </button>
      </div>
    </>
  );
}

function AddLead({ open, onClose, choices, onDone }: { open: boolean; onClose: () => void; choices: { value: string; label: string }[]; onDone: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const { act, pending } = useAct();
  const empty = { service: choices[0]?.value ?? 'not-sure', name: '', phone: '', email: '', company: '', message: '' };
  const [f, setF] = useState(empty);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      setF(empty);
      d.showModal();
    }
    if (!open && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog ref={dlg} className="ad-modal" onClose={onClose} onClick={(e) => e.target === dlg.current && onClose()}>
      <form
        className="ad-modal__body"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await act(() => leadCreate(f), 'הליד נוסף');
          if (r.ok) {
            onDone();
            onClose();
          }
        }}
      >
        <h2>ליד חדש</h2>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>שם</span>
            <input className="ad-input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} />
          </label>
          <label className="ad-field">
            <span>טלפון</span>
            <input className="ad-input ltr" dir="ltr" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={30} />
          </label>
          <label className="ad-field">
            <span>אימייל</span>
            <input className="ad-input ltr" dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={180} />
          </label>
          <label className="ad-field">
            <span>עסק</span>
            <input className="ad-input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} maxLength={120} />
          </label>
        </div>
        <label className="ad-field">
          <span>כיוון הפנייה</span>
          <Select aria-label="כיוון הפנייה" value={f.service} onChange={(v) => setF({ ...f, service: v })} options={choices.map((c) => ({ value: c.value, label: c.label }))} />
        </label>
        <label className="ad-field">
          <span>הודעה או הקשר</span>
          <textarea className="ad-textarea" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={3000} />
        </label>
        <div className="ad-modal__foot">
          <button type="submit" className="ad-btn ad-btn--primary" disabled={pending}>
            הוספה
          </button>
          <button type="button" className="ad-btn" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </dialog>
  );
}
