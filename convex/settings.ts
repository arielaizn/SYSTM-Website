import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, assertSafeHref, logAudit, requireKey, settingsData } from './lib';

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return await ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', 'site')).unique();
  },
});

export const save = mutation({
  args: { key: v.string(), data: settingsData },
  handler: async (ctx, { key, data }) => {
    requireKey(key);
    if (!/^\+?[0-9]{8,15}$/.test(data.phone.replace(/[\s-]/g, ''))) throw new Error('invalid phone');
    if (!/^[0-9]{8,15}$/.test(data.whatsapp)) throw new Error('whatsapp must be digits with country code, no plus');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) throw new Error('invalid email');
    assertMax('description', data.description, 400);
    assertMax('banner text', data.banner.text, 200);
    assertSafeHref(data.banner.href);
    if (data.socials.length > 10) throw new Error('too many social links');
    for (const s of data.socials) {
      assertMax('social label', s.label, 40);
      if (!/^https:\/\//.test(s.href)) throw new Error('social links must be https');
    }
    const existing = await ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', 'site')).unique();
    const doc = { key: 'site', ...data, updatedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, doc);
    else await ctx.db.insert('settings', doc);
    await logAudit(ctx, 'settings.save', 'settings', 'עודכנו הגדרות האתר');
  },
});
