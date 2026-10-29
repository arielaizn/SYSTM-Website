'use server';

import { updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { adminMutation, adminQuery } from '../../lib/admin-api';
import { verifyPassword } from '../../lib/admin-password';
import { checkLogin, recordFailure, recordSuccess } from '../../lib/admin-rate';
import { dropVersionCache, endSession, requireAdminAction, startSession } from '../../lib/admin-session';
import { adminConfigured } from '../../lib/convex-server';
import { normalizeBlocks, type AnyBlock } from '../../lib/landing';
import { bodyToSections, sanitizeBody } from '../../lib/sanitize';
import { articles as defaultArticles, faqs as defaultFaqs, services as defaultServices } from '../../lib/content';
import { defaultSettings } from '../../lib/content-source';

export type R<T = null> = { ok: true; data: T } | { ok: false; error: string };
const ok = <T,>(data: T): R<T> => ({ ok: true, data });

const HEBREW: Record<string, string> = {
  'slug already in use': 'הכתובת (slug) כבר בשימוש',
  'invalid slug': 'כתובת לא תקינה: אותיות אנגליות קטנות, ספרות ומקפים בלבד',
  'label and title are required': 'חובה למלא שם וכותרת',
  'title is required': 'חובה למלא כותרת',
  'unknown diagram': 'איור לא מוכר',
  'too many list items': 'יותר מדי פריטים ברשימה',
  'too many sections': 'יותר מדי פרקים',
  'invalid phone': 'מספר טלפון לא תקין',
  'whatsapp must be digits with country code, no plus': 'מספר וואטסאפ: ספרות בלבד, עם קידומת מדינה ובלי פלוס (972534122548)',
  'invalid email': 'כתובת אימייל לא תקינה',
  'social links must be https': 'קישורי רשתות חייבים להתחיל ב־https',
  'href must be a site path or an https/mailto/tel link': 'קישור לא תקין. אפשר נתיב באתר (/contact/) או https',
  'question and answer are required': 'חובה למלא שאלה ותשובה',
  'name too short': 'השם קצר מדי',
  'empty note': 'ההערה ריקה',
  'duplicate service slug': 'יש שני שירותים עם אותה כתובת',
  'duplicate article slug': 'יש שני מדריכים עם אותה כתובת',
  'blocks must be valid JSON': 'תוכן הדף אינו תקין',
  'too many blocks': 'יותר מדי בלוקים בדף',
  'invalid block': 'אחד הבלוקים אינו תקין',
  'url must be an https link': 'הקישור חייב להתחיל ב־https',
  'invalid code': 'קוד קצר: אותיות אנגליות קטנות, ספרות, מקף וקו תחתון (2 עד 40 תווים)',
  'code already in use': 'הקוד הקצר כבר בשימוש',
  'could not allocate a code': 'לא הצלחנו ליצור קוד. נסו שוב',
  'too many leads at once': 'אפשר לטפל בעד 200 לידים בבת אחת',
  timeout: 'השרת לא ענה בזמן. נסו שוב',
  unauthorized: 'פג תוקף ההתחברות. התחברו מחדש',
};

function fail(e: unknown): R<never> {
  const raw = e instanceof Error ? e.message : String(e);
  if (/^[֐-׿]/.test(raw)) return { ok: false, error: raw.slice(0, 200) };
  const hit = raw.match(/Uncaught Error: ([^\n]+)/)?.[1] ?? raw;
  const clean = hit.replace(/\s+at .*$/, '').trim().slice(0, 220);
  const known = Object.entries(HEBREW).find(([k]) => clean.includes(k));
  return { ok: false, error: known ? known[1] : clean.includes('is too long') ? 'אחד השדות ארוך מדי' : 'הפעולה נכשלה. נסו שוב' };
}

async function run<T>(fn: () => Promise<T>, opts: { content?: boolean } = {}): Promise<R<T>> {
  try {
    await requireAdminAction();
    const data = await fn();
    if (opts.content) updateTag('content');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// --- Session --------------------------------------------------------------------------------------
/** `retryAfter` (seconds) is set while the address is locked out. `n` grows on every failed attempt so the client can react to each one. */
export type LoginState = { error?: string; retryAfter?: number; n?: number };

export async function login(prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: 'ממשק הניהול עדיין לא הוגדר' };
  const n = (prev.n ?? 0) + 1;
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'local').split(',')[0].trim();
  const gate = checkLogin(ip);
  if (!gate.allowed) return { error: 'יותר מדי ניסיונות', retryAfter: Math.max(1, Math.ceil(gate.retryAfterSec)), n };

  const password = String(form.get('password') ?? '');
  if (!verifyPassword(password)) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
    const after = checkLogin(ip);
    return after.allowed ? { error: 'הסיסמה שגויה', n } : { error: 'יותר מדי ניסיונות', retryAfter: Math.max(1, Math.ceil(after.retryAfterSec)), n };
  }
  recordSuccess(ip);
  await startSession();
  try {
    await adminMutation(api.system.logEvent, { action: 'login', summary: 'התחברות לממשק הניהול' });
  } catch {}
  const next = String(form.get('next') ?? '');
  redirect(/^\/admin(\/[\w\-/[\]]*)?$/.test(next) ? next : '/admin');
}

export async function logout() {
  try {
    await requireAdminAction();
    await adminMutation(api.system.logEvent, { action: 'logout', summary: 'יציאה מהממשק' });
  } catch {}
  await endSession();
  redirect('/admin/login');
}

export async function signOutEverywhere(): Promise<R> {
  return run(async () => {
    await adminMutation(api.system.bumpSession, {});
    dropVersionCache();
    return null;
  });
}

// --- Push (new-lead notifications on the admin's devices) ---------------------------------------------
export async function pushSubscribe(sub: { endpoint: string; p256dh: string; auth: string; label: string }): Promise<R> {
  return run(async () => {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) throw new Error('חסרים פרטי המכשיר. נסו שוב');
    await adminMutation(api.push.subscribe, sub);
    return null;
  });
}

export async function pushUnsubscribe(endpoint: string): Promise<R> {
  return run(async () => {
    await adminMutation(api.push.unsubscribe, { endpoint });
    return null;
  });
}

export async function pushTest(): Promise<R> {
  return run(async () => {
    const { notifyAdmins, pushConfigured } = await import('../../lib/push');
    if (!pushConfigured()) throw new Error('התראות דחיפה לא הוגדרו בשרת');
    const r = await notifyAdmins({ title: 'בדיקה מהניהול של SYSTM', body: 'ככה תראה התראה על ליד חדש', url: '/admin/leads/?status=new', tag: 'push-test' });
    if (r.sent === 0) throw new Error('לא נשלחה התראה. ודאו שההתראות פועלות במכשיר הזה');
    return null;
  });
}

// --- Leads ------------------------------------------------------------------------------------------
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam';

export async function leadUpdate(id: string, patch: { status?: LeadStatus; tags?: string[]; name?: string; phone?: string; email?: string; company?: string; service?: string }) {
  return run(async () => {
    await adminMutation(api.leads.update, { id: id as Id<'leads'>, patch });
    return null;
  });
}

export async function leadAddNote(id: string, text: string) {
  return run(async () => {
    await adminMutation(api.leads.addNote, { id: id as Id<'leads'>, text });
    return null;
  });
}

export async function leadDelete(id: string) {
  return run(async () => {
    await adminMutation(api.leads.remove, { id: id as Id<'leads'> });
    return null;
  });
}

export async function leadBulk(ids: string[], action: 'status' | 'delete', status?: LeadStatus) {
  return run(async () => {
    await adminMutation(api.leads.bulk, { ids: ids as Id<'leads'>[], action, status });
    return null;
  });
}

export async function leadCreate(lead: { service: string; name: string; phone: string; email: string; company: string; message: string }) {
  return run(async () => adminMutation(api.leads.submit, { lead: { ...lead, source: 'manual' } }));
}

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function leadsCsv() {
  return run(async () => {
    const rows = await adminQuery(api.leads.list, {});
    const head = ['תאריך', 'שם', 'טלפון', 'אימייל', 'עסק', 'שירות', 'סטטוס', 'מקור', 'תגיות', 'הודעה', 'הערות'];
    const lines = rows.map((l) =>
      [new Date(l.createdAt).toISOString().replace('T', ' ').slice(0, 16), l.name, l.phone, l.email, l.company, l.service, l.status, l.source, l.tags.join(' | '), l.message, l.notes.map((n) => n.text).join(' | ')].map(csvCell).join(','),
    );
    return '﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n');
  });
}

// --- Services ----------------------------------------------------------------------------------------
type ServiceInput = {
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

export async function serviceSave(id: string | null, data: ServiceInput) {
  return run(async () => (await adminMutation(api.services.upsert, { id: (id as Id<'services'>) ?? undefined, data })) as string, { content: true });
}

export async function serviceDelete(id: string) {
  return run(
    async () => {
      await adminMutation(api.services.remove, { id: id as Id<'services'> });
      return null;
    },
    { content: true },
  );
}

export async function serviceReorder(ids: string[]) {
  return run(
    async () => {
      await adminMutation(api.services.reorder, { ids: ids as Id<'services'>[] });
      return null;
    },
    { content: true },
  );
}

// --- IndexNow (Bing, Yandex and others learn about new URLs immediately) ------------------------------------
export async function indexNowSubmit() {
  return run(async () => {
    const key = process.env.INDEXNOW_KEY ?? '';
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    if (!/^[A-Za-z0-9-]{8,128}$/.test(key) || !base.startsWith('https://')) throw new Error('IndexNow לא הוגדר: צריך INDEXNOW_KEY ו־NEXT_PUBLIC_SITE_URL');
    const { default: sitemap } = await import('../sitemap');
    const urlList = (await sitemap()).map((e) => e.url);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/api/indexnow`, urlList }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok && res.status !== 202) throw new Error(`IndexNow ענה ${res.status}`);
    return { sent: urlList.length };
  });
}

// --- Landing pages --------------------------------------------------------------------------------------
export type PageInput = { slug: string; title: string; status: 'draft' | 'published'; blocks: AnyBlock[]; seoTitle?: string; seoDescription?: string; ogImage?: string; noindex?: boolean };

export async function pageSave(id: string | null, input: PageInput) {
  // Blocks are rebuilt from scratch on the server: unknown types dropped, links and images restricted, rich text sanitized.
  const blocks = normalizeBlocks(input.blocks, sanitizeBody);
  const data = { slug: input.slug, title: input.title, status: input.status, blocks: JSON.stringify(blocks), seoTitle: input.seoTitle || undefined, seoDescription: input.seoDescription || undefined, ogImage: input.ogImage || undefined, noindex: input.noindex || undefined };
  return run(async () => (await adminMutation(api.pages.upsert, { id: (id as Id<'pages'>) ?? undefined, data })) as string, { content: true });
}

export async function pageSetStatus(id: string, status: 'draft' | 'published') {
  return run(async () => { await adminMutation(api.pages.setStatus, { id: id as Id<'pages'>, status }); return null; }, { content: true });
}

export async function pageDelete(id: string) {
  return run(async () => { await adminMutation(api.pages.remove, { id: id as Id<'pages'> }); return null; }, { content: true });
}

// --- Short links ----------------------------------------------------------------------------------------
export async function linkCreate(input: { url: string; code?: string; note?: string }) {
  return run(async () => (await adminMutation(api.links.create, { url: input.url.trim(), code: input.code?.trim() || undefined, note: input.note?.trim() || undefined })) as { id: string; code: string });
}

export async function linkUpdate(id: string, patch: { url?: string; note?: string; active?: boolean }) {
  return run(async () => { await adminMutation(api.links.update, { id: id as Id<'links'>, ...patch }); return null; });
}

export async function linkDelete(id: string) {
  return run(async () => { await adminMutation(api.links.remove, { id: id as Id<'links'> }); return null; });
}

// --- Articles -----------------------------------------------------------------------------------------
type ArticleInput = { slug: string; status: 'draft' | 'published'; category: string; title: string; summary: string; read: string; sections: { h: string; t: string }[]; body?: string; seoTitle?: string; seoDescription?: string; focusKeyword?: string; ogImage?: string };

export async function articleSave(id: string | null, input: ArticleInput) {
  // The rich-text body is sanitized here, on the server, before it reaches Convex. `sections` becomes a plain-text mirror of it.
  const body = input.body ? sanitizeBody(input.body) : '';
  const data = { ...input, body: body || undefined, sections: body ? bodyToSections(body) : input.sections };
  return run(async () => (await adminMutation(api.articles.upsert, { id: (id as Id<'articles'>) ?? undefined, data })) as string, { content: true });
}

export async function articleSetStatus(id: string, status: 'draft' | 'published') {
  return run(
    async () => {
      await adminMutation(api.articles.setStatus, { id: id as Id<'articles'>, status });
      return null;
    },
    { content: true },
  );
}

export async function articleDelete(id: string) {
  return run(
    async () => {
      await adminMutation(api.articles.remove, { id: id as Id<'articles'> });
      return null;
    },
    { content: true },
  );
}

// --- FAQs ------------------------------------------------------------------------------------------------
export async function faqSave(id: string | null, data: { q: string; a: string; published: boolean }) {
  return run(async () => (await adminMutation(api.faqs.upsert, { id: (id as Id<'faqs'>) ?? undefined, data })) as string, { content: true });
}

export async function faqDelete(id: string) {
  return run(
    async () => {
      await adminMutation(api.faqs.remove, { id: id as Id<'faqs'> });
      return null;
    },
    { content: true },
  );
}

export async function faqReorder(ids: string[]) {
  return run(
    async () => {
      await adminMutation(api.faqs.reorder, { ids: ids as Id<'faqs'>[] });
      return null;
    },
    { content: true },
  );
}

// --- Settings --------------------------------------------------------------------------------------------
export async function settingsSave(data: { phone: string; phoneDisplay: string; whatsapp: string; email: string; description: string; socials: { label: string; href: string }[]; banner: { enabled: boolean; text: string; href: string } }) {
  return run(
    async () => {
      await adminMutation(api.settings.save, { data });
      return null;
    },
    { content: true },
  );
}

// --- Data: seed, export, import ---------------------------------------------------------------------------
function builtInContent() {
  return {
    settings: defaultSettings,
    services: defaultServices.map((s) => ({ slug: s.slug, published: true, number: s.number, label: s.label, short: s.short, title: s.title, intro: s.intro, meta: s.meta, items: s.items, example: s.example, fit: s.fit, outcome: s.outcome, faqs: s.faqs.map(([q, a]) => ({ q, a })), diagram: s.diagram })),
    articles: defaultArticles.map((a) => ({ slug: a.slug, status: 'published' as const, category: a.category, title: a.title, summary: a.summary, read: a.read, sections: a.sections.map(([h, t]) => ({ h, t })) })),
    faqs: defaultFaqs.map(([q, a]) => ({ q, a, published: true })),
  };
}

/** Copies the site's built-in copy into Convex (replacing any content there) so it becomes editable. */
export async function seedDefaults() {
  return run(
    async () => {
      await adminMutation(api.system.importContent, builtInContent());
      return null;
    },
    { content: true },
  );
}

export async function exportData() {
  return run(async () => JSON.stringify(await adminQuery(api.system.exportAll, {}), null, 2));
}

type Backup = { version?: number; settings?: Record<string, unknown> | null; services?: Record<string, unknown>[]; articles?: Record<string, unknown>[]; faqs?: Record<string, unknown>[]; leads?: unknown[] };

function parseBackup(json: string): Backup {
  try {
    return JSON.parse(json) as Backup;
  } catch {
    throw new Error('הקובץ אינו JSON תקין');
  }
}

const omit = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

export async function importContent(json: string) {
  return run(
    async () => {
      const b = parseBackup(json);
      if (!b || !Array.isArray(b.services) || !Array.isArray(b.articles) || !Array.isArray(b.faqs)) throw new Error('הקובץ אינו גיבוי של האתר');
      await adminMutation(api.system.importContent, {
        settings: b.settings ? omit(b.settings, ['key', 'updatedAt']) : undefined,
        services: b.services.map((s) => omit(s, ['order', 'updatedAt'])),
        articles: b.articles.map((a) => omit(a, ['updatedAt'])),
        faqs: b.faqs.map((f) => omit(f, ['order'])),
      } as never);
      return { services: b.services.length, articles: b.articles.length, faqs: b.faqs.length };
    },
    { content: true },
  );
}

export async function importLeads(json: string) {
  return run(async () => {
    const b = parseBackup(json);
    if (!b || !Array.isArray(b.leads)) throw new Error('בקובץ אין לידים');
    return await adminMutation(api.system.importLeads, { leads: b.leads as never });
  });
}
