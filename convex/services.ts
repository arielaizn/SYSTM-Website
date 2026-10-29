import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { logAudit, requireKey, serviceData, validateService } from './lib';

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return await ctx.db.query('services').withIndex('by_order').collect();
  },
});

export const upsert = mutation({
  args: { key: v.string(), id: v.optional(v.id('services')), data: serviceData },
  handler: async (ctx, { key, id, data }) => {
    requireKey(key);
    validateService(data);
    const clash = await ctx.db.query('services').withIndex('by_slug', (q) => q.eq('slug', data.slug)).unique();
    if (clash && clash._id !== id) throw new Error('slug already in use');
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
      await logAudit(ctx, 'service.update', data.slug, `עודכן שירות: ${data.label}`);
      return id;
    }
    const last = await ctx.db.query('services').withIndex('by_order').order('desc').first();
    const newId = await ctx.db.insert('services', { ...data, order: (last?.order ?? -1) + 1, updatedAt: Date.now() });
    await logAudit(ctx, 'service.create', data.slug, `נוצר שירות: ${data.label}`);
    return newId;
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('services') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'service.delete', doc.slug, `נמחק שירות: ${doc.label}`);
  },
});

export const reorder = mutation({
  args: { key: v.string(), ids: v.array(v.id('services')) },
  handler: async (ctx, { key, ids }) => {
    requireKey(key);
    await Promise.all(ids.map((id, i) => ctx.db.patch(id, { order: i })));
    await logAudit(ctx, 'service.reorder', 'services', 'שונה סדר השירותים');
  },
});
