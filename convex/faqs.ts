import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, faqData, logAudit, requireKey } from './lib';

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return await ctx.db.query('faqs').withIndex('by_order').collect();
  },
});

export const upsert = mutation({
  args: { key: v.string(), id: v.optional(v.id('faqs')), data: faqData },
  handler: async (ctx, { key, id, data }) => {
    requireKey(key);
    if (!data.q.trim() || !data.a.trim()) throw new Error('question and answer are required');
    assertMax('question', data.q, 300);
    assertMax('answer', data.a, 2000);
    if (id) {
      await ctx.db.patch(id, data);
      await logAudit(ctx, 'faq.update', id, `עודכנה שאלה: ${data.q.slice(0, 60)}`);
      return id;
    }
    const last = await ctx.db.query('faqs').withIndex('by_order').order('desc').first();
    const newId = await ctx.db.insert('faqs', { ...data, order: (last?.order ?? -1) + 1 });
    await logAudit(ctx, 'faq.create', newId, `נוספה שאלה: ${data.q.slice(0, 60)}`);
    return newId;
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('faqs') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'faq.delete', id, `נמחקה שאלה: ${doc.q.slice(0, 60)}`);
  },
});

export const reorder = mutation({
  args: { key: v.string(), ids: v.array(v.id('faqs')) },
  handler: async (ctx, { key, ids }) => {
    requireKey(key);
    await Promise.all(ids.map((id, i) => ctx.db.patch(id, { order: i })));
    await logAudit(ctx, 'faq.reorder', 'faqs', 'שונה סדר השאלות הנפוצות');
  },
});
