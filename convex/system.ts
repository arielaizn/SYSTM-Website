import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { articleData, faqData, leadStatus, logAudit, requireKey, serviceData, settingsData, validateArticle, validateService } from './lib';

const articleImport = v.object({ ...articleData.fields, publishedAt: v.optional(v.number()) });
const leadImport = v.object({
  service: v.string(),
  name: v.string(),
  phone: v.string(),
  email: v.string(),
  company: v.string(),
  message: v.string(),
  status: leadStatus,
  source: v.string(),
  tags: v.array(v.string()),
  notes: v.array(v.object({ at: v.number(), text: v.string() })),
  createdAt: v.number(),
  updatedAt: v.number(),
  contactedAt: v.optional(v.number()),
});

async function getMeta(ctx: { db: { query: Function } }, key: string) {
  return await (ctx.db as any).query('meta').withIndex('by_key', (q: any) => q.eq('key', key)).unique();
}

export const sessionVersion = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return ((await getMeta(ctx, 'session'))?.value as number | undefined) ?? 1;
  },
});

/** "Sign out everywhere": every signed cookie carries the version it was issued under. */
export const bumpSession = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const row = await getMeta(ctx, 'session');
    const next = ((row?.value as number | undefined) ?? 1) + 1;
    if (row) await ctx.db.patch(row._id, { value: next });
    else await ctx.db.insert('meta', { key: 'session', value: next });
    await logAudit(ctx, 'security.signout-all', 'session', 'יציאה מכל המכשירים');
    return next;
  },
});

export const status = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const count = async (t: 'services' | 'articles' | 'faqs' | 'leads' | 'audit') => (await ctx.db.query(t).collect()).length;
    return {
      seeded: (await getMeta(ctx, 'seeded'))?.value === 1,
      services: await count('services'),
      articles: await count('articles'),
      faqs: await count('faqs'),
      leads: await count('leads'),
      audit: await count('audit'),
    };
  },
});

export const auditList = query({
  args: { key: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { key, limit }) => {
    requireKey(key);
    return await ctx.db.query('audit').withIndex('by_at').order('desc').take(Math.min(500, limit ?? 100));
  },
});

export const exportAll = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const strip = <T extends Record<string, unknown>>(d: T) => {
      const { _id, _creationTime, ...rest } = d as Record<string, unknown>;
      void _id;
      void _creationTime;
      return rest;
    };
    return {
      version: 1,
      exportedAt: Date.now(),
      settings: ((await ctx.db.query('settings').collect()).map(strip)[0] ?? null) as Record<string, unknown> | null,
      services: (await ctx.db.query('services').withIndex('by_order').collect()).map(strip),
      articles: (await ctx.db.query('articles').collect()).map(strip),
      faqs: (await ctx.db.query('faqs').withIndex('by_order').collect()).map(strip),
      leads: (await ctx.db.query('leads').withIndex('by_created').take(5000)).map(strip),
    };
  },
});

/**
 * Replaces ALL editable content (settings, services, articles, faqs) with the payload and marks the site as
 * seeded, so the public site starts reading from Convex. Used for the first import of the built-in copy and for restores.
 */
export const importContent = mutation({
  args: {
    key: v.string(),
    settings: v.optional(settingsData),
    services: v.array(serviceData),
    articles: v.array(articleImport),
    faqs: v.array(faqData),
  },
  handler: async (ctx, { key, settings, services, articles, faqs }) => {
    requireKey(key);
    services.forEach(validateService);
    articles.forEach(validateArticle);
    if (new Set(services.map((s) => s.slug)).size !== services.length) throw new Error('duplicate service slug');
    if (new Set(articles.map((a) => a.slug)).size !== articles.length) throw new Error('duplicate article slug');

    for (const t of ['services', 'articles', 'faqs'] as const) for (const d of await ctx.db.query(t).collect()) await ctx.db.delete(d._id);
    const now = Date.now();
    for (const [i, s] of services.entries()) await ctx.db.insert('services', { ...s, order: i, updatedAt: now });
    for (const a of articles) {
      await ctx.db.insert('articles', { ...a, publishedAt: a.status === 'published' ? a.publishedAt ?? now : undefined, updatedAt: now });
    }
    for (const [i, f] of faqs.entries()) await ctx.db.insert('faqs', { ...f, order: i });
    if (settings) {
      const existing = await ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', 'site')).unique();
      const doc = { key: 'site', ...settings, updatedAt: now };
      if (existing) await ctx.db.replace(existing._id, doc);
      else await ctx.db.insert('settings', doc);
    }
    const seeded = await getMeta(ctx, 'seeded');
    if (seeded) await ctx.db.patch(seeded._id, { value: 1 });
    else await ctx.db.insert('meta', { key: 'seeded', value: 1 });
    await logAudit(ctx, 'content.import', 'content', `יובא תוכן: ${services.length} שירותים, ${articles.length} מדריכים, ${faqs.length} שאלות`);
  },
});

/** Adds leads that are not already present (same createdAt and phone). Existing leads are never touched. */
export const importLeads = mutation({
  args: { key: v.string(), leads: v.array(leadImport) },
  handler: async (ctx, { key, leads }) => {
    requireKey(key);
    if (leads.length > 1000) throw new Error('too many leads in one import');
    const existing = await ctx.db.query('leads').withIndex('by_created').take(5000);
    const have = new Set(existing.map((l) => `${l.createdAt}|${l.phone}`));
    let added = 0;
    for (const l of leads) {
      if (have.has(`${l.createdAt}|${l.phone}`)) continue;
      await ctx.db.insert('leads', l);
      added++;
    }
    await logAudit(ctx, 'leads.import', 'leads', `יובאו ${added} לידים חדשים`);
    return added;
  },
});

/** Records sign-in and sign-out in the activity log. */
export const logEvent = mutation({
  args: { key: v.string(), action: v.string(), summary: v.string() },
  handler: async (ctx, { key, action, summary }) => {
    requireKey(key);
    await logAudit(ctx, action, 'session', summary);
  },
});
