import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, logAudit, requireKey } from './lib';

const CODE = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function assertUrl(url: string) {
  if (!/^https:\/\/[^\s]+$/.test(url) || url.length > 2000) throw new Error('url must be an https link');
}

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return await ctx.db.query('links').withIndex('by_created').order('desc').collect();
  },
});

export const create = mutation({
  args: { key: v.string(), url: v.string(), code: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, { key, url, code, note }) => {
    requireKey(key);
    assertUrl(url);
    assertMax('note', note ?? '', 200);
    let c = (code ?? '').trim().toLowerCase();
    if (c) {
      if (!CODE.test(c)) throw new Error('invalid code');
    } else {
      for (let attempt = 0; attempt < 8 && !c; attempt++) {
        let t = '';
        for (let i = 0; i < 6; i++) t += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        if (!(await ctx.db.query('links').withIndex('by_code', (q) => q.eq('code', t)).unique())) c = t;
      }
      if (!c) throw new Error('could not allocate a code');
    }
    if (await ctx.db.query('links').withIndex('by_code', (q) => q.eq('code', c)).unique()) throw new Error('code already in use');
    const id = await ctx.db.insert('links', { code: c, url, note: note ?? '', active: true, clicks: 0, createdAt: Date.now() });
    await logAudit(ctx, 'link.create', c, `נוצר קישור קצר: ${c}`);
    return { id, code: c };
  },
});

export const update = mutation({
  args: { key: v.string(), id: v.id('links'), url: v.optional(v.string()), note: v.optional(v.string()), active: v.optional(v.boolean()) },
  handler: async (ctx, { key, id, ...patch }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error('not found');
    if (patch.url !== undefined) assertUrl(patch.url);
    if (patch.note !== undefined) assertMax('note', patch.note, 200);
    await ctx.db.patch(id, Object.fromEntries(Object.entries(patch).filter(([, x]) => x !== undefined)));
    await logAudit(ctx, 'link.update', doc.code, `עודכן קישור קצר: ${doc.code}`);
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('links') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'link.delete', doc.code, `נמחק קישור קצר: ${doc.code}`);
  },
});

/** Called by /go/<code> on the server (with the key): returns the target and counts the click in one step. */
export const follow = mutation({
  args: { key: v.string(), code: v.string() },
  handler: async (ctx, { key, code }) => {
    requireKey(key);
    const doc = await ctx.db.query('links').withIndex('by_code', (q) => q.eq('code', code.toLowerCase())).unique();
    if (!doc || !doc.active) return null;
    await ctx.db.patch(doc._id, { clicks: doc.clicks + 1, lastClickAt: Date.now() });
    return doc.url;
  },
});
