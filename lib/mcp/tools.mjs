// Every tool the MCP server exposes. A tool is plain data: name, input schema, kind and a run function.
//   read         never changes anything on the site
//   local        writes only to this machine (backup file)
//   write        changes the site; blocked when SYSTM_READONLY is on
//   destructive  deletes; needs confirm: true after the user said yes, and shows what would go first
// Writes that touch public content (`publish: true`) purge the site cache right after, so the edit is live in seconds.
import { z } from 'zod';
import { revalidateTag } from 'next/cache';

// Remote (hosted) copy of systm-admin-plugin/src/tools.mjs. The tool definitions are identical so a model sees the same
// tools locally and remotely; only three things differ: no local-file backup tool, `describeConfig` and `publishNow`
// below. Keep the two files in sync (tests/mcp-tools.test.ts fails when the tool names drift apart).
const describeConfig = (cfg) => ({ remote: true, readonly: cfg.readonly, keySet: true });
/** In-process cache purge: the MCP route runs inside the site, so no HTTP round trip and no key is needed. */
async function publishNow() {
  try {
    revalidateTag('content', { expire: 0 });
    return { done: true };
  } catch {
    return { done: false, reason: 'לא הצלחתי לרענן את האתר. העדכון יופיע תוך עד 5 דקות.' };
  }
}

export const DIAGRAMS = ['ai-agents', 'automation', 'consulting', 'workshops', 'claude-code'];
export const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'];

const iso = (ts) => (typeof ts === 'number' ? new Date(ts).toISOString() : undefined);
const hoursSince = (ts, now) => Math.round(((now - ts) / 3_600_000) * 10) / 10;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

const compactLead = (l, now) => ({
  id: l._id,
  name: l.name,
  phone: l.phone,
  ...(l.email ? { email: l.email } : {}),
  ...(l.company ? { company: l.company } : {}),
  service: l.service,
  status: l.status,
  tags: l.tags,
  createdAt: iso(l.createdAt),
  ageHours: hoursSince(l.createdAt, now),
  message: clip(l.message, 200),
  notes: l.notes.length,
});

const fullLead = (l, now) => ({
  ...compactLead({ ...l, message: l.message }, now),
  message: l.message,
  notes: l.notes.map((n) => ({ at: iso(n.at), text: n.text })),
  source: l.source,
  contactedAt: iso(l.contactedAt),
  updatedAt: iso(l.updatedAt),
});

const stripService = ({ _id, _creationTime, updatedAt, ...s }) => ({ id: _id, ...s, updatedAt: iso(updatedAt) });
const stripArticle = ({ _id, _creationTime, updatedAt, publishedAt, ...a }) => ({ id: _id, ...a, publishedAt: iso(publishedAt), updatedAt: iso(updatedAt) });

const qa = z.object({ q: z.string().max(300), a: z.string().max(2000) });
const serviceFields = z
  .object({
    published: z.boolean().describe('true puts the service on the live site'),
    number: z.string().max(4).describe('Display number, e.g. "01"'),
    label: z.string().max(80),
    short: z.string().max(400),
    title: z.string().max(240),
    intro: z.string().max(2000),
    meta: z.string().max(240),
    items: z.array(z.string().max(300)).max(30),
    example: z.array(z.string().max(300)).max(20),
    fit: z.string().max(800),
    outcome: z.string().max(800),
    faqs: z.array(qa).max(20),
    diagram: z.enum(DIAGRAMS),
  })
  .partial();
const articleFields = z
  .object({
    category: z.string().max(60),
    title: z.string().max(240),
    summary: z.string().max(600),
    read: z.string().max(30).describe('Reading time label, e.g. "5 דק׳"'),
    sections: z.array(z.object({ h: z.string().max(240), t: z.string().max(8000) })).max(40),
    body: z.string().max(200000).describe('Rich-text HTML body (h2/h3/p/ul/ol/a/img/table/blockquote...). Preferred over sections. h2 headings become the table of contents; the site sanitizes it on render.'),
    seoTitle: z.string().max(120).describe('Title for Google, ideally 30-60 characters'),
    seoDescription: z.string().max(320).describe('Meta description, ideally 70-160 characters'),
    focusKeyword: z.string().max(80).describe('The one phrase this guide should rank for'),
    ogImage: z.string().max(2000).describe('https:// image for social sharing'),
    coverStyle: z.number().int().min(0).max(7).describe('Cover composition 0-7. Omit for the automatic one derived from the slug'),
    coverSeed: z.number().int().min(0).max(999999).describe('Re-rolls the cover variation without changing the composition'),
    narration: z.boolean().describe('Show the read-aloud player on the guide (default true)'),
    showToc: z.boolean().describe('Show the table of contents beside the guide (default true). A <div data-type="toc"></div> in body adds an inline one'),
  })
  .partial();
const settingsFields = z
  .object({
    phone: z.string().max(30),
    phoneDisplay: z.string().max(30),
    whatsapp: z.string().max(20).describe('Digits only with country code, no plus: 972534122548'),
    email: z.string().max(180),
    description: z.string().max(400),
    socials: z.array(z.object({ label: z.string().max(40), href: z.string().max(300) })).max(12),
  })
  .partial();

const SERVICE_DEFAULTS = { published: false, number: '', label: '', short: '', title: '', intro: '', meta: '', items: [], example: [], fit: '', outcome: '', faqs: [], diagram: 'consulting' };
const NOT_SEEDED = 'התוכן עוד לא יובא ל־Convex. פתחו את /admin פעם אחת ולחצו על ״ייבוא התוכן הקיים לעריכה״, ואז אפשר לערוך מכאן.';

const need = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function findBySlug(api, table, slug) {
  const rows = await api.query(`${table}.list`);
  const row = rows.find((r) => r.slug === slug);
  need(row, `לא נמצא ${table === 'services' ? 'שירות' : 'מדריך'} עם הכתובת "${slug}".`);
  return row;
}


const stripTags = (h) => h.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|h[2-4]|tr|blockquote|div)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
/** Plain-text mirror of an HTML body, split at each <h2>: keeps site search and old consumers working. */
export function bodyToSections(html) {
  const parts = html.split(/<h2(?:\s[^>]*)?>/);
  const out = [];
  const intro = stripTags(parts[0] ?? '');
  if (intro) out.push({ h: 'מבוא', t: intro.slice(0, 8000) });
  for (const p of parts.slice(1)) {
    const [h, ...rest] = p.split('</h2>');
    out.push({ h: stripTags(h).slice(0, 200), t: stripTags(rest.join('')).slice(0, 8000) });
  }
  return out.filter((x) => x.h || x.t).slice(0, 20);
}

const BLOCK_TYPES = ['hero', 'text', 'features', 'steps', 'stats', 'image', 'video', 'testimonials', 'faq', 'cta', 'form', 'spacer'];
const blockSchema = z.object({
  id: z.string().max(20).optional(),
  type: z.enum(BLOCK_TYPES),
  hidden: z.boolean().optional(),
  style: z.object({ surface: z.enum(['none', 'glass', 'ice', 'dark']), padY: z.enum(['sm', 'md', 'lg']), align: z.enum(['start', 'center']), width: z.enum(['narrow', 'normal', 'wide']), hideOn: z.enum(['', 'mobile', 'desktop']), anchor: z.string().max(40) }).partial().optional(),
  props: z.record(z.string(), z.any()),
});
const BLOCK_HELP = 'Blocks, in order. Types and props: hero{eyebrow,title,subtitle,ctaLabel,ctaHref,secondaryLabel,secondaryHref,image} · text{html} · features{title,intro,columns:2|3|4,items:[{title,text}]} · steps{title,items:[{title,text}]} · stats{items:[{value,label}]} · image{src(https),alt,caption} · video{url(youtube),caption} · testimonials{title,items:[{quote,name,role}]} · faq{title,items:[{q,a}]} · cta{title,text,label,href} · form{title,text,button,service} (the lead form; give it style.anchor "lead" and link buttons to #lead) · spacer{height}. style: surface none|glass|ice|dark, padY sm|md|lg, align start|center, width narrow|normal|wide, hideOn ""|mobile|desktop, anchor.';
const DEFAULT_STYLE = { surface: 'none', padY: 'md', align: 'start', width: 'normal', hideOn: '', anchor: '' };
const rid = () => Math.random().toString(36).slice(2, 10);
const shapeBlocks = (blocks) => blocks.map((b) => ({ id: b.id || rid(), type: b.type, ...(b.hidden ? { hidden: true } : {}), style: { ...DEFAULT_STYLE, ...(b.style ?? {}) }, props: b.props }));
const pageFields = z
  .object({
    title: z.string().max(200),
    blocks: z.array(blockSchema).max(80).describe(BLOCK_HELP),
    seoTitle: z.string().max(120),
    seoDescription: z.string().max(320),
    ogImage: z.string().max(2000),
    noindex: z.boolean().describe('true keeps the page out of Google (for paid-traffic-only pages)'),
  })
  .partial();
const LINK_CODE = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export function buildTools() {
  const confirm = z.boolean().optional().describe('Must be true, and only after the user explicitly agreed to this deletion');
  const leadId = z.string().min(5).max(64).describe('Lead id from systm_leads_list');

  return [
    // --- Read ---------------------------------------------------------------------------------------------
    {
      name: 'systm_status',
      title: 'Connection and content status',
      description: 'Check the connection to the SYSTM admin backend and show counts of services, articles, FAQs and leads. Run this first when something seems off.',
      kind: 'read',
      noConfig: true,
      input: {},
      run: async (_a, { api, cfg }) => {
        if (cfg.problems.length) return { configured: false, problems: cfg.problems, hint: 'Run the setup command, or set SYSTM_CONVEX_URL and SYSTM_ADMIN_KEY.' };
        const counts = await api.query('system.status');
        return { configured: true, connected: true, ...describeConfig(cfg), counts, note: counts.seeded ? undefined : NOT_SEEDED };
      },
    },
    {
      name: 'systm_dashboard',
      title: 'Leads dashboard numbers',
      description: 'Lead counts by status, 30-day trend, close rate, median time to first reply and leads waiting more than 24 hours.',
      kind: 'read',
      input: {},
      run: (_a, { api }) => api.query('leads.stats'),
    },
    {
      name: 'systm_leads_list',
      title: 'List leads',
      description: 'List leads, newest first. status "all" returns every status except spam. Messages are cut to 200 characters; use systm_lead_get for the full lead with notes.',
      kind: 'read',
      input: {
        status: z.enum(['all', ...STATUSES]).default('new'),
        q: z.string().max(200).optional().describe('Search in name, phone, email, company, message, tags and notes'),
        limit: z.number().int().min(1).max(100).default(20),
      },
      run: async ({ status, q, limit }, { api, now }) => {
        const rows = await api.query('leads.list', { ...(status === 'all' ? {} : { status }), ...(q ? { q } : {}) });
        const pool = status === 'all' ? rows.filter((l) => l.status !== 'spam') : rows;
        return { total: pool.length, shown: Math.min(limit, pool.length), leads: pool.slice(0, limit).map((l) => compactLead(l, now)) };
      },
    },
    {
      name: 'systm_lead_get',
      title: 'Get one lead',
      description: 'Full lead: contact details, whole message, all notes with times, tags and status history timestamps.',
      kind: 'read',
      input: { id: leadId },
      run: async ({ id }, { api, now }) => {
        const lead = (await api.query('leads.list', {})).find((l) => l._id === id);
        need(lead, 'לא נמצא ליד עם ה־id הזה.');
        return fullLead(lead, now);
      },
    },
    {
      name: 'systm_services_list',
      title: 'List services',
      description: 'All services in display order with slug, label, published flag and last update.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => (await api.query('services.list')).map((s) => ({ slug: s.slug, number: s.number, label: s.label, published: s.published, updatedAt: iso(s.updatedAt) })),
    },
    {
      name: 'systm_service_get',
      title: 'Get one service',
      description: 'Every field of a service page, found by slug.',
      kind: 'read',
      input: { slug: z.string().max(80) },
      run: async ({ slug }, { api }) => stripService(await findBySlug(api, 'services', slug)),
    },
    {
      name: 'systm_articles_list',
      title: 'List guides',
      description: 'All knowledge-base guides with slug, title, status (draft or published) and dates.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => (await api.query('articles.list')).map((a) => ({ slug: a.slug, title: a.title, status: a.status, category: a.category, publishedAt: iso(a.publishedAt), updatedAt: iso(a.updatedAt) })),
    },
    {
      name: 'systm_article_get',
      title: 'Get one guide',
      description: 'Every field of a guide, including all its sections, found by slug.',
      kind: 'read',
      input: { slug: z.string().max(80) },
      run: async ({ slug }, { api }) => stripArticle(await findBySlug(api, 'articles', slug)),
    },
    {
      name: 'systm_faqs_list',
      title: 'List FAQs',
      description: 'All frequently asked questions in display order, with id and published flag.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => (await api.query('faqs.list')).map((f) => ({ id: f._id, order: f.order, published: f.published, q: f.q, a: f.a })),
    },
    {
      name: 'systm_settings_get',
      title: 'Site settings',
      description: 'Phone, WhatsApp, email, social links, site description and the top-of-site banner.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => {
        const s = await api.query('settings.get');
        if (!s) return { seeded: false, note: NOT_SEEDED };
        const { _id, _creationTime, updatedAt, key, ...rest } = s;
        return { ...rest, updatedAt: iso(updatedAt) };
      },
    },
    {
      name: 'systm_activity',
      title: 'Activity log',
      description: 'Latest actions in the admin log: who changed what and when, including changes made through this plugin.',
      kind: 'read',
      input: { limit: z.number().int().min(1).max(200).default(30) },
      run: async ({ limit }, { api }) => (await api.query('system.auditList', { limit })).map((r) => ({ at: iso(r.at), action: r.action, target: r.target, summary: r.summary })),
    },
    // --- Write: leads -------------------------------------------------------------------------------------
    {
      name: 'systm_lead_update',
      title: 'Update a lead',
      description: 'Change a lead\'s status, tags or contact fields. Only the fields you pass change. The first move away from "new" stamps the first-reply time, which feeds the dashboard.',
      kind: 'write',
      input: {
        id: leadId,
        status: z.enum(STATUSES).optional(),
        tags: z.array(z.string().max(30)).max(12).optional().describe('The complete tag list after the change'),
        name: z.string().max(100).optional(),
        phone: z.string().max(30).optional(),
        email: z.string().max(180).optional(),
        company: z.string().max(120).optional(),
        service: z.string().max(40).optional(),
      },
      run: async ({ id, ...patch }, { api }) => {
        need(Object.keys(patch).length > 0, 'לא נשלח שדה לעדכון.');
        await api.mutation('leads.update', { id, patch });
        return { ok: true, id, changed: patch };
      },
      target: (a) => a.id,
    },
    {
      name: 'systm_lead_note',
      title: 'Add a note to a lead',
      description: 'Append an internal note (up to 2000 characters). Notes are timestamped and never shown on the site.',
      kind: 'write',
      input: { id: leadId, text: z.string().min(1).max(2000) },
      run: async ({ id, text }, { api }) => {
        await api.mutation('leads.addNote', { id, text });
        return { ok: true, id };
      },
      target: (a) => a.id,
    },
    {
      name: 'systm_lead_create',
      title: 'Add a lead by hand',
      description: 'Create a lead that did not come through the form (a phone call, a referral). It appears in the inbox as "new", marked as manual.',
      kind: 'write',
      input: {
        name: z.string().min(2).max(100),
        phone: z.string().min(8).max(30),
        service: z.string().max(40).default('not-sure').describe('A service slug or "not-sure"'),
        email: z.string().max(180).default(''),
        company: z.string().max(120).default(''),
        message: z.string().max(3000).default(''),
      },
      run: async ({ name, phone, service, email, company, message }, { api }) => {
        const id = await api.mutation('leads.submit', { lead: { name, phone, service, email, company, message, source: 'manual' } });
        return { ok: true, id };
      },
      target: (a) => a.name,
    },

    // --- Write: public content ----------------------------------------------------------------------------
    {
      name: 'systm_service_save',
      title: 'Create or edit a service page',
      description: `Edit the service with this slug (only the fields you pass change) or create it. A new service needs label, title, short, intro and diagram, and starts hidden until published:true. diagram is one of ${DIAGRAMS.join(', ')}. The slug cannot be renamed here.`,
      kind: 'write',
      publish: true,
      input: { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60), fields: serviceFields },
      run: async ({ slug, fields }, { api }) => {
        const rows = await api.query('services.list');
        const cur = rows.find((s) => s.slug === slug);
        if (cur) {
          const { _id, _creationTime, order, updatedAt, ...rest } = cur;
          await api.mutation('services.upsert', { id: _id, data: { ...rest, ...fields, slug } });
          return { ok: true, slug, created: false, changed: Object.keys(fields) };
        }
        const missing = ['label', 'title', 'short', 'intro', 'diagram'].filter((k) => !fields[k]);
        need(missing.length === 0, `שירות חדש דורש גם: ${missing.join(', ')}.`);
        await api.mutation('services.upsert', { data: { ...SERVICE_DEFAULTS, ...fields, slug } });
        return { ok: true, slug, created: true, published: Boolean(fields.published) };
      },
      target: (a) => a.slug,
    },
    {
      name: 'systm_article_save',
      title: 'Create or edit a guide',
      description: 'Edit the guide with this slug (only the fields you pass change) or create it. A new guide needs title, summary and a body (rich HTML, preferred) or sections, and starts as a draft. Set focusKeyword, seoTitle and seoDescription for Google. Use systm_article_status to publish it.',
      kind: 'write',
      publish: true,
      input: { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60), fields: articleFields },
      run: async ({ slug, fields }, { api }) => {
        const rows = await api.query('articles.list');
        const cur = rows.find((a) => a.slug === slug);
        if (cur) {
          const { _id, _creationTime, updatedAt, publishedAt, ...rest } = cur;
          const next = { ...rest, ...fields, slug };
          if (fields.body && !fields.sections) next.sections = bodyToSections(fields.body);
          await api.mutation('articles.upsert', { id: _id, data: next });
          return { ok: true, slug, created: false, status: cur.status, changed: Object.keys(fields) };
        }
        const sections = fields.sections ?? (fields.body ? bodyToSections(fields.body) : undefined);
        const missing = ['title', 'summary'].filter((k) => !fields[k]).concat(sections ? [] : ['body או sections']);
        need(missing.length === 0, `מדריך חדש דורש גם: ${missing.join(', ')}.`);
        await api.mutation('articles.upsert', { data: { status: 'draft', category: '', read: '', ...fields, sections, slug } });
        return { ok: true, slug, created: true, status: 'draft' };
      },
      target: (a) => a.slug,
    },
    {
      name: 'systm_article_status',
      title: 'Publish or unpublish a guide',
      description: 'Set a guide to published (live on the site) or draft (hidden).',
      kind: 'write',
      publish: true,
      input: { slug: z.string().max(80), status: z.enum(['draft', 'published']) },
      run: async ({ slug, status }, { api }) => {
        const cur = await findBySlug(api, 'articles', slug);
        await api.mutation('articles.setStatus', { id: cur._id, status });
        return { ok: true, slug, status };
      },
      target: (a) => `${a.slug} → ${a.status}`,
    },
    {
      name: 'systm_faq_save',
      title: 'Create or edit an FAQ',
      description: 'With id: edit that FAQ, only the fields you pass change. Without id: create one (q and a required). A new FAQ starts hidden; pass published:true to put it on the site.',
      kind: 'write',
      publish: true,
      input: { id: z.string().max(64).optional(), q: z.string().max(300).optional(), a: z.string().max(2000).optional(), published: z.boolean().optional() },
      run: async ({ id, q, a, published }, { api }) => {
        if (id) {
          const cur = (await api.query('faqs.list')).find((f) => f._id === id);
          need(cur, 'לא נמצאה שאלה עם ה־id הזה.');
          await api.mutation('faqs.upsert', { id, data: { q: q ?? cur.q, a: a ?? cur.a, published: published ?? cur.published } });
          return { ok: true, id, created: false };
        }
        need(q && a, 'שאלה חדשה דורשת גם שאלה (q) וגם תשובה (a).');
        const newId = await api.mutation('faqs.upsert', { data: { q, a, published: published ?? false } });
        return { ok: true, id: newId, created: true, published: published ?? false };
      },
      target: (a) => a.id ?? (a.q ? clip(a.q, 40) : ''),
    },
    {
      name: 'systm_settings_save',
      title: 'Edit site settings',
      description: 'Change phone, WhatsApp, email, social links or the site description. Only the fields you pass change. The banner has its own tool (systm_banner).',
      kind: 'write',
      publish: true,
      input: { fields: settingsFields },
      run: async ({ fields }, { api }) => {
        need(Object.keys(fields).length > 0, 'לא נשלח שדה לעדכון.');
        const cur = await api.query('settings.get');
        need(cur, NOT_SEEDED);
        const { _id, _creationTime, updatedAt, key, ...rest } = cur;
        await api.mutation('settings.save', { data: { ...rest, ...fields } });
        return { ok: true, changed: Object.keys(fields) };
      },
      target: (a) => Object.keys(a.fields).join(','),
    },
    {
      name: 'systm_banner',
      title: 'Turn the top banner on or off',
      description: 'The announcement bar at the top of every public page. enabled:false hides it and keeps the text for later. href is a site path like /workshops/ or an https link.',
      kind: 'write',
      publish: true,
      input: { enabled: z.boolean(), text: z.string().max(200).optional(), href: z.string().max(300).optional() },
      run: async ({ enabled, text, href }, { api }) => {
        const cur = await api.query('settings.get');
        need(cur, NOT_SEEDED);
        const { _id, _creationTime, updatedAt, key, ...rest } = cur;
        const banner = { enabled, text: text ?? rest.banner.text, href: href ?? rest.banner.href };
        need(!enabled || banner.text.trim(), 'כדי להדליק את הבאנר צריך טקסט.');
        await api.mutation('settings.save', { data: { ...rest, banner } });
        return { ok: true, banner };
      },
      target: (a) => (a.enabled ? 'on' : 'off'),
    },
    {
      name: 'systm_reorder',
      title: 'Reorder services or FAQs',
      description: 'Set the display order. For services pass every slug in the new order. For FAQs pass every id in the new order. The list must contain exactly the existing items.',
      kind: 'write',
      publish: true,
      input: { kind: z.enum(['services', 'faqs']), order: z.array(z.string().max(80)).min(1).max(100) },
      run: async ({ kind, order }, { api }) => {
        const rows = await api.query(`${kind}.list`);
        const key = (r) => (kind === 'services' ? r.slug : r._id);
        const have = new Set(rows.map(key));
        need(order.length === have.size && order.every((k) => have.has(k)) && new Set(order).size === order.length, `הרשימה חייבת לכלול בדיוק את כל הפריטים הקיימים: ${[...have].join(', ')}`);
        const byKey = new Map(rows.map((r) => [key(r), r._id]));
        await api.mutation(`${kind}.reorder`, { ids: order.map((k) => byKey.get(k)) });
        return { ok: true, kind, order };
      },
      target: (a) => a.kind,
    },
    {
      name: 'systm_publish',
      title: 'Refresh the live site now',
      description: 'Purge the site cache so saved edits show immediately. Edits made through this plugin already do this; use it after an edit made in the admin screen, or when the site looks stale.',
      kind: 'write',
      noLog: true,
      input: {},
      run: async (_a, { cfg, fetchImpl }) => ({ publish: await publishNow(cfg, fetchImpl) }),
    },

    // --- Destructive --------------------------------------------------------------------------------------
    {
      name: 'systm_lead_delete',
      title: 'Delete a lead',
      description: 'Permanently delete a lead and its notes. Cannot be undone. If the person only needs it out of the way, set the status to spam instead. Without confirm:true nothing is deleted and the target is shown.',
      kind: 'destructive',
      input: { id: leadId, confirm },
      preview: async ({ id }, { api }) => {
        const l = (await api.query('leads.list', {})).find((x) => x._id === id);
        need(l, 'לא נמצא ליד עם ה־id הזה.');
        return `הליד ${l.name} (${l.phone}), סטטוס ${l.status}, עם ${l.notes.length} הערות`;
      },
      run: async ({ id }, { api }) => {
        await api.mutation('leads.remove', { id });
        return { ok: true, deleted: id };
      },
      target: (a) => a.id,
    },
    {
      name: 'systm_service_delete',
      title: 'Delete a service',
      description: 'Permanently delete a service page. Its address stops working. To hide it without losing it, use systm_service_save with published:false. Without confirm:true nothing is deleted.',
      kind: 'destructive',
      publish: true,
      input: { slug: z.string().max(80), confirm },
      preview: async ({ slug }, { api }) => `השירות "${(await findBySlug(api, 'services', slug)).label}" (${slug})`,
      run: async ({ slug }, { api }) => {
        await api.mutation('services.remove', { id: (await findBySlug(api, 'services', slug))._id });
        return { ok: true, deleted: slug };
      },
      target: (a) => a.slug,
    },
    {
      name: 'systm_article_delete',
      title: 'Delete a guide',
      description: 'Permanently delete a guide. To hide it, set its status to draft. Without confirm:true nothing is deleted.',
      kind: 'destructive',
      publish: true,
      input: { slug: z.string().max(80), confirm },
      preview: async ({ slug }, { api }) => `המדריך "${(await findBySlug(api, 'articles', slug)).title}" (${slug})`,
      run: async ({ slug }, { api }) => {
        await api.mutation('articles.remove', { id: (await findBySlug(api, 'articles', slug))._id });
        return { ok: true, deleted: slug };
      },
      target: (a) => a.slug,
    },
    {
      name: 'systm_faq_delete',
      title: 'Delete an FAQ',
      description: 'Permanently delete a question. To hide it, use systm_faq_save with published:false. Without confirm:true nothing is deleted.',
      kind: 'destructive',
      publish: true,
      input: { id: z.string().max(64), confirm },
      preview: async ({ id }, { api }) => {
        const f = (await api.query('faqs.list')).find((x) => x._id === id);
        need(f, 'לא נמצאה שאלה עם ה־id הזה.');
        return `השאלה "${clip(f.q, 80)}"`;
      },
      run: async ({ id }, { api }) => {
        await api.mutation('faqs.remove', { id });
        return { ok: true, deleted: id };
      },
      target: (a) => a.id,
    },

    // --- Landing pages ------------------------------------------------------------------------------------
    {
      name: 'systm_pages_list',
      title: 'List landing pages',
      description: 'List the landing pages built in the admin (served at /lp/<slug>/): slug, title, status, block count.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => (await api.query('pages.list')).map((p) => ({ id: p._id, slug: p.slug, title: p.title, status: p.status, blocks: p.blockCount, noindex: !!p.noindex, updatedAt: iso(p.updatedAt) })),
    },
    {
      name: 'systm_page_get',
      title: 'Read a landing page',
      description: 'Full landing page with its blocks and SEO fields.',
      kind: 'read',
      input: { slug: z.string().max(80) },
      run: async ({ slug }, { api }) => {
        const row = (await api.query('pages.list')).find((p) => p.slug === slug);
        need(row, `לא נמצא דף נחיתה עם הכתובת "${slug}".`);
        const doc = await api.query('pages.get', { id: row._id });
        let blocks = [];
        try { blocks = JSON.parse(doc.blocks); } catch { /* corrupted page: report no blocks */ }
        const { _id, _creationTime, blocks: _b, updatedAt, publishedAt, ...rest } = doc;
        return { id: _id, ...rest, blocks, publishedAt: iso(publishedAt), updatedAt: iso(updatedAt) };
      },
    },
    {
      name: 'systm_page_save',
      title: 'Create or edit a landing page',
      description: 'Edit the landing page with this slug (only the fields you pass change; passing blocks replaces all blocks) or create it as a draft. Publish with systm_page_status. ' + BLOCK_HELP,
      kind: 'write',
      publish: true,
      input: { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60), fields: pageFields },
      run: async ({ slug, fields }, { api }) => {
        const row = (await api.query('pages.list')).find((p) => p.slug === slug);
        const { blocks, ...meta } = fields;
        if (row) {
          const cur = await api.query('pages.get', { id: row._id });
          const { _id, _creationTime, updatedAt, publishedAt, ...rest } = cur;
          await api.mutation('pages.upsert', { id: _id, data: { ...rest, ...meta, slug, ...(blocks ? { blocks: JSON.stringify(shapeBlocks(blocks)) } : {}) } });
          return { ok: true, slug, created: false, status: cur.status, changed: Object.keys(fields) };
        }
        need(fields.title && blocks && blocks.length > 0, 'דף נחיתה חדש דורש title ולפחות בלוק אחד.');
        await api.mutation('pages.upsert', { data: { status: 'draft', ...meta, title: fields.title, slug, blocks: JSON.stringify(shapeBlocks(blocks)) } });
        return { ok: true, slug, created: true, status: 'draft', url: `/lp/${slug}/` };
      },
      target: (a) => a.slug,
    },
    {
      name: 'systm_page_status',
      title: 'Publish or unpublish a landing page',
      description: 'Set a landing page to published (live at /lp/<slug>/) or draft (hidden).',
      kind: 'write',
      publish: true,
      input: { slug: z.string().max(80), status: z.enum(['draft', 'published']) },
      run: async ({ slug, status }, { api }) => {
        const row = (await api.query('pages.list')).find((p) => p.slug === slug);
        need(row, `לא נמצא דף נחיתה עם הכתובת "${slug}".`);
        await api.mutation('pages.setStatus', { id: row._id, status });
        return { ok: true, slug, status };
      },
      target: (a) => `${a.slug} → ${a.status}`,
    },
    {
      name: 'systm_page_delete',
      title: 'Delete a landing page',
      description: 'Permanently delete a landing page. To hide it, set its status to draft. Without confirm:true nothing is deleted.',
      kind: 'destructive',
      publish: true,
      input: { slug: z.string().max(80), confirm },
      preview: async ({ slug }, { api }) => {
        const row = (await api.query('pages.list')).find((p) => p.slug === slug);
        need(row, `לא נמצא דף נחיתה עם הכתובת "${slug}".`);
        return `דף הנחיתה "${row.title}" (${slug})`;
      },
      run: async ({ slug }, { api }) => {
        const row = (await api.query('pages.list')).find((p) => p.slug === slug);
        need(row, `לא נמצא דף נחיתה עם הכתובת "${slug}".`);
        await api.mutation('pages.remove', { id: row._id });
        return { ok: true, deleted: slug };
      },
      target: (a) => a.slug,
    },

    // --- Short links --------------------------------------------------------------------------------------
    {
      name: 'systm_links_list',
      title: 'List short links',
      description: 'Short links (/go/<code>) with their target, click count and last click.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => (await api.query('links.list')).map((l) => ({ id: l._id, code: l.code, url: l.url, note: l.note, active: l.active, clicks: l.clicks, lastClickAt: iso(l.lastClickAt), createdAt: iso(l.createdAt) })),
    },
    {
      name: 'systm_link_create',
      title: 'Create a short link',
      description: 'Create /go/<code> that redirects to an https URL and counts clicks. Omit code for a random 6-character one. Add UTM parameters to the URL yourself when the user wants campaign tracking.',
      kind: 'write',
      input: { url: z.string().url().max(2000).refine((u) => u.startsWith('https://'), 'must be https'), code: z.string().regex(LINK_CODE).optional(), note: z.string().max(200).optional() },
      run: async ({ url, code, note }, { api }) => {
        const r = await api.mutation('links.create', { url, code, note });
        return { ok: true, code: r.code, short: `/go/${r.code}` };
      },
      target: (a) => a.code ?? a.url,
    },
    {
      name: 'systm_link_update',
      title: 'Edit a short link',
      description: 'Change the target, note, or pause/resume a short link by its code.',
      kind: 'write',
      input: { code: z.string().regex(LINK_CODE), url: z.string().url().max(2000).optional(), note: z.string().max(200).optional(), active: z.boolean().optional() },
      run: async ({ code, ...patch }, { api }) => {
        const row = (await api.query('links.list')).find((l) => l.code === code);
        need(row, `לא נמצא קישור קצר עם הקוד "${code}".`);
        await api.mutation('links.update', { id: row._id, ...patch });
        return { ok: true, code, changed: Object.keys(patch) };
      },
      target: (a) => a.code,
    },
    {
      name: 'systm_link_delete',
      title: 'Delete a short link',
      description: 'Permanently delete a short link; it stops working everywhere it was shared. To pause it, use systm_link_update with active:false. Without confirm:true nothing is deleted.',
      kind: 'destructive',
      input: { code: z.string().regex(LINK_CODE), confirm },
      preview: async ({ code }, { api }) => {
        const row = (await api.query('links.list')).find((l) => l.code === code);
        need(row, `לא נמצא קישור קצר עם הקוד "${code}".`);
        return `הקישור /go/${code} (${row.clicks} קליקים)`;
      },
      run: async ({ code }, { api }) => {
        const row = (await api.query('links.list')).find((l) => l.code === code);
        need(row, `לא נמצא קישור קצר עם הקוד "${code}".`);
        await api.mutation('links.remove', { id: row._id });
        return { ok: true, deleted: code };
      },
      target: (a) => a.code,
    },

    // --- SEO ----------------------------------------------------------------------------------------------
    {
      name: 'systm_seo_audit',
      title: 'SEO audit of guides and landing pages',
      description: 'Checks every guide and landing page for Google basics: title and description length, focus keyword placement, word count, headings, internal links and duplicate focus keywords. Returns the issues to fix, worst first. Fix them with systm_article_save / systm_page_save.',
      kind: 'read',
      input: {},
      run: async (_a, { api }) => {
        const arts = await api.query('articles.list');
        const pages = await api.query('pages.list').catch(() => []);
        const has = (hay, n) => !!n && hay.toLowerCase().includes(n.trim().toLowerCase());
        const guides = arts.map((a) => {
          const html = a.body ?? a.sections.map((x) => `<h2>${x.h}</h2><p>${x.t}</p>`).join('');
          const text = stripTags(html);
          const words = text.split(/\s+/).filter(Boolean).length;
          const title = a.seoTitle || a.title;
          const desc = a.seoDescription || a.summary;
          const kw = a.focusKeyword ?? '';
          const issues = [];
          if (!kw) issues.push('אין מילת מפתח ראשית (focusKeyword)');
          if (title.length < 30 || title.length > 60) issues.push(`אורך כותרת לגוגל ${title.length} (רצוי 30-60)`);
          if (desc.length < 70 || desc.length > 160) issues.push(`אורך תיאור ${desc.length} (רצוי 70-160)`);
          if (kw && !has(title, kw)) issues.push('מילת המפתח לא מופיעה בכותרת');
          if (kw && !has(text.split(/\s+/).slice(0, 120).join(' '), kw)) issues.push('מילת המפתח לא מופיעה ב־120 המילים הראשונות');
          if (words < 300) issues.push(`רק ${words} מילים (רצוי 300+)`);
          if ((html.match(/<h2/g) ?? []).length < 2) issues.push('פחות משתי כותרות H2');
          if (!/<a\b[^>]*href="\//.test(html)) issues.push('אין קישור פנימי');
          return { slug: a.slug, title: a.title, status: a.status, words, issues };
        });
        const kws = {};
        for (const a of arts) if (a.focusKeyword) (kws[a.focusKeyword.trim().toLowerCase()] ??= []).push(a.slug);
        return {
          guides: guides.sort((x, y) => y.issues.length - x.issues.length),
          landingPages: pages.map((p) => ({ slug: p.slug, title: p.title, status: p.status, issues: [...(p.seoDescription ? [] : ['אין תיאור לגוגל']), ...(p.seoTitle ? [] : ['אין כותרת SEO נפרדת'])] })),
          keywordConflicts: Object.entries(kws).filter(([, v]) => v.length > 1).map(([keyword, slugs]) => ({ keyword, slugs })),
        };
      },
    },
  ];
}
