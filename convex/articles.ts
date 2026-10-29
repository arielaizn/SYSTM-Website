import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { articleData, logAudit, requireKey, validateArticle } from './lib';

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const all = await ctx.db.query('articles').collect();
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const upsert = mutation({
  args: { key: v.string(), id: v.optional(v.id('articles')), data: articleData },
  handler: async (ctx, { key, id, data }) => {
    requireKey(key);
    validateArticle(data);
    const clash = await ctx.db.query('articles').withIndex('by_slug', (q) => q.eq('slug', data.slug)).unique();
    if (clash && clash._id !== id) throw new Error('slug already in use');
    const now = Date.now();
    const existing = id ? await ctx.db.get(id) : null;
    const publishedAt = data.status === 'published' ? existing?.publishedAt ?? now : undefined;
    const doc = { ...data, publishedAt, updatedAt: now };
    if (id && existing) {
      await ctx.db.replace(id, doc);
      await logAudit(ctx, 'article.update', data.slug, `עודכן מדריך: ${data.title}`);
      return id;
    }
    const newId = await ctx.db.insert('articles', doc);
    await logAudit(ctx, 'article.create', data.slug, `נוצר מדריך: ${data.title}`);
    return newId;
  },
});

export const setStatus = mutation({
  args: { key: v.string(), id: v.id('articles'), status: v.union(v.literal('draft'), v.literal('published')) },
  handler: async (ctx, { key, id, status }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error('not found');
    await ctx.db.patch(id, { status, publishedAt: status === 'published' ? doc.publishedAt ?? Date.now() : undefined, updatedAt: Date.now() });
    await logAudit(ctx, status === 'published' ? 'article.publish' : 'article.unpublish', doc.slug, `${status === 'published' ? 'פורסם' : 'הוסר מהפרסום'}: ${doc.title}`);
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('articles') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'article.delete', doc.slug, `נמחק מדריך: ${doc.title}`);
  },
});
