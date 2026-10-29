import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, logAudit, requireKey } from './lib';

export const subscribe = mutation({
  args: { key: v.string(), endpoint: v.string(), p256dh: v.string(), auth: v.string(), label: v.string() },
  handler: async (ctx, { key, endpoint, p256dh, auth, label }) => {
    requireKey(key);
    if (!/^https:\/\//.test(endpoint)) throw new Error('invalid endpoint');
    assertMax('endpoint', endpoint, 1000);
    assertMax('label', label, 80);
    const existing = await ctx.db.query('pushSubs').withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint)).unique();
    if (existing) await ctx.db.patch(existing._id, { p256dh, auth, label });
    else {
      const all = await ctx.db.query('pushSubs').collect();
      if (all.length >= 20) throw new Error('too many devices');
      await ctx.db.insert('pushSubs', { endpoint, p256dh, auth, label, createdAt: Date.now() });
      await logAudit(ctx, 'push.subscribe', 'push', `מכשיר חדש להתראות: ${label}`);
    }
  },
});

export const unsubscribe = mutation({
  args: { key: v.string(), endpoint: v.string() },
  handler: async (ctx, { key, endpoint }) => {
    requireKey(key);
    const existing = await ctx.db.query('pushSubs').withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint)).unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      await logAudit(ctx, 'push.unsubscribe', 'push', `הוסר מכשיר מהתראות: ${existing.label}`);
    }
  },
});

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return await ctx.db.query('pushSubs').collect();
  },
});
