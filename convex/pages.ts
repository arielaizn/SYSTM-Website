import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, assertSafeHref, assertSlug, logAudit, requireKey } from './lib';

const pageData = v.object({
  slug: v.string(),
  title: v.string(),
  status: v.union(v.literal('draft'), v.literal('published')),
  blocks: v.string(),
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  noindex: v.optional(v.boolean()),
});

function validate(d: { slug: string; title: string; blocks: string; seoTitle?: string; seoDescription?: string; ogImage?: string }) {
  assertSlug(d.slug);
  if (!d.title.trim()) throw new Error('title is required');
  assertMax('title', d.title, 200);
  assertMax('blocks', d.blocks, 400000);
  assertMax('seo title', d.seoTitle ?? '', 120);
  assertMax('seo description', d.seoDescription ?? '', 320);
  if (d.ogImage) assertSafeHref(d.ogImage);
  let parsed: unknown;
  try {
    parsed = JSON.parse(d.blocks);
  } catch {
    throw new Error('blocks must be valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.length > 80) throw new Error('too many blocks');
  for (const b of parsed) if (!b || typeof b !== 'object' || typeof (b as { id?: unknown }).id !== 'string' || typeof (b as { type?: unknown }).type !== 'string') throw new Error('invalid block');
}

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const all = await ctx.db.query('pages').withIndex('by_updated').order('desc').collect();
    // The list never ships the blocks: they can be large and the list does not need them.
    return all.map(({ blocks, ...rest }) => ({ ...rest, blockCount: (() => { try { return (JSON.parse(blocks) as unknown[]).length; } catch { return 0; } })() }));
  },
});

export const get = query({
  args: { key: v.string(), id: v.id('pages') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    return await ctx.db.get(id);
  },
});

/** Used by the public site (server side, with the key). Returns published pages only unless `draft` is asked for. */
export const bySlug = query({
  args: { key: v.string(), slug: v.string() },
  handler: async (ctx, { key, slug }) => {
    requireKey(key);
    const doc = await ctx.db.query('pages').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    return doc && doc.status === 'published' ? doc : null;
  },
});

export const publishedSlugs = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const all = await ctx.db.query('pages').collect();
    return all.filter((p) => p.status === 'published').map((p) => ({ slug: p.slug, updatedAt: p.updatedAt, noindex: p.noindex ?? false }));
  },
});

export const upsert = mutation({
  args: { key: v.string(), id: v.optional(v.id('pages')), data: pageData },
  handler: async (ctx, { key, id, data }) => {
    requireKey(key);
    validate(data);
    const clash = await ctx.db.query('pages').withIndex('by_slug', (q) => q.eq('slug', data.slug)).unique();
    if (clash && clash._id !== id) throw new Error('slug already in use');
    const now = Date.now();
    const existing = id ? await ctx.db.get(id) : null;
    const publishedAt = data.status === 'published' ? existing?.publishedAt ?? now : undefined;
    const doc = { ...data, publishedAt, updatedAt: now };
    if (id && existing) {
      await ctx.db.replace(id, doc);
      await logAudit(ctx, 'page.update', data.slug, `עודכן דף נחיתה: ${data.title}`);
      return id;
    }
    const newId = await ctx.db.insert('pages', doc);
    await logAudit(ctx, 'page.create', data.slug, `נוצר דף נחיתה: ${data.title}`);
    return newId;
  },
});

export const setStatus = mutation({
  args: { key: v.string(), id: v.id('pages'), status: v.union(v.literal('draft'), v.literal('published')) },
  handler: async (ctx, { key, id, status }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error('not found');
    await ctx.db.patch(id, { status, publishedAt: status === 'published' ? doc.publishedAt ?? Date.now() : undefined, updatedAt: Date.now() });
    await logAudit(ctx, status === 'published' ? 'page.publish' : 'page.unpublish', doc.slug, `${status === 'published' ? 'פורסם' : 'הוסר מהפרסום'} דף נחיתה: ${doc.title}`);
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('pages') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'page.delete', doc.slug, `נמחק דף נחיתה: ${doc.title}`);
  },
});
