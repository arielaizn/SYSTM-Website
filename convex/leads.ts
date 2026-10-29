import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertMax, leadStatus, logAudit, requireKey } from './lib';

const digits = (s: string) => s.replace(/\D/g, '');
const DAY = 86_400_000;

const leadInput = v.object({
  service: v.string(),
  name: v.string(),
  phone: v.string(),
  email: v.string(),
  company: v.string(),
  message: v.string(),
  source: v.string(),
});

/** Called by the site's /api/leads (server to server, with the admin key) and by the manual "add lead" form. */
export const submit = mutation({
  args: { key: v.string(), lead: leadInput },
  handler: async (ctx, { key, lead }) => {
    requireKey(key);
    const name = lead.name.trim();
    if (name.length < 2) throw new Error('name too short');
    const d = digits(lead.phone);
    if (d.length < 8 || d.length > 15) throw new Error('invalid phone');
    assertMax('name', name, 100);
    assertMax('message', lead.message, 3000);
    assertMax('service', lead.service, 40);
    assertMax('email', lead.email, 180);
    assertMax('company', lead.company, 120);
    assertMax('source', lead.source, 40);

    const now = Date.now();
    const recent = await ctx.db.query('leads').withIndex('by_created', (q) => q.gte('createdAt', now - DAY)).collect();
    const duplicate = recent.some((l) => digits(l.phone) === d);
    const id = await ctx.db.insert('leads', {
      ...lead,
      name,
      phone: lead.phone.trim(),
      status: 'new',
      tags: duplicate ? ['כפילות'] : [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, 'lead.create', id, `ליד חדש: ${name}${lead.source === 'manual' ? ' (ידני)' : ''}`);
    return id;
  },
});

export const list = query({
  args: { key: v.string(), status: v.optional(v.string()), q: v.optional(v.string()) },
  handler: async (ctx, { key, status, q }) => {
    requireKey(key);
    let rows = await ctx.db.query('leads').withIndex('by_created').order('desc').take(2000);
    if (status && status !== 'all') rows = rows.filter((l) => l.status === status);
    const needle = q?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((l) => `${l.name} ${l.phone} ${l.email} ${l.company} ${l.message} ${l.tags.join(' ')} ${l.notes.map((n) => n.text).join(' ')}`.toLowerCase().includes(needle));
    }
    return rows;
  },
});

export const stats = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const rows = await ctx.db.query('leads').withIndex('by_created').order('desc').take(5000);
    const now = Date.now();
    const byStatus: Record<string, number> = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0, spam: 0 };
    const byService: Record<string, number> = {};
    const dayKey = (ts: number) => new Date(ts + 3 * 3_600_000).toISOString().slice(0, 10);
    const daily: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) daily[dayKey(now - i * DAY)] = 0;
    let last7 = 0;
    let last30 = 0;
    let responseSum = 0;
    let responseN = 0;
    for (const l of rows) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
      if (l.status !== 'spam') byService[l.service] = (byService[l.service] ?? 0) + 1;
      if (l.createdAt >= now - 7 * DAY && l.status !== 'spam') last7++;
      if (l.createdAt >= now - 30 * DAY && l.status !== 'spam') last30++;
      const k = dayKey(l.createdAt);
      if (k in daily && l.status !== 'spam') daily[k]++;
      if (l.contactedAt) {
        responseSum += l.contactedAt - l.createdAt;
        responseN++;
      }
    }
    const real = rows.length - byStatus.spam;
    return {
      total: rows.length,
      real,
      byStatus,
      byService,
      daily: Object.entries(daily).map(([day, n]) => ({ day, n })),
      last7,
      last30,
      winRate: real ? Math.round((byStatus.won / real) * 1000) / 10 : 0,
      avgFirstContactHours: responseN ? Math.round((responseSum / responseN / 3_600_000) * 10) / 10 : null,
    };
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    id: v.id('leads'),
    patch: v.object({
      status: v.optional(leadStatus),
      tags: v.optional(v.array(v.string())),
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      company: v.optional(v.string()),
      service: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { key, id, patch }) => {
    requireKey(key);
    const lead = await ctx.db.get(id);
    if (!lead) throw new Error('not found');
    if (patch.tags && (patch.tags.length > 12 || patch.tags.some((t) => t.length > 30))) throw new Error('invalid tags');
    for (const [k, max] of [['name', 100], ['phone', 30], ['email', 180], ['company', 120], ['service', 40]] as const) {
      const val = patch[k];
      if (val !== undefined) assertMax(k, val, max);
    }
    const next: Record<string, unknown> = { ...patch, updatedAt: Date.now() };
    if (patch.status && patch.status !== lead.status) {
      if (patch.status !== 'new' && patch.status !== 'spam' && !lead.contactedAt) next.contactedAt = Date.now();
      await logAudit(ctx, 'lead.status', id, `${lead.name}: ${lead.status} ← ${patch.status}`);
    }
    await ctx.db.patch(id, next);
  },
});

export const addNote = mutation({
  args: { key: v.string(), id: v.id('leads'), text: v.string() },
  handler: async (ctx, { key, id, text }) => {
    requireKey(key);
    const t = text.trim();
    if (!t) throw new Error('empty note');
    assertMax('note', t, 2000);
    const lead = await ctx.db.get(id);
    if (!lead) throw new Error('not found');
    if (lead.notes.length >= 100) throw new Error('too many notes');
    await ctx.db.patch(id, { notes: [...lead.notes, { at: Date.now(), text: t }], updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id('leads') },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const lead = await ctx.db.get(id);
    if (!lead) return;
    await ctx.db.delete(id);
    await logAudit(ctx, 'lead.delete', id, `נמחק ליד: ${lead.name}`);
  },
});

export const bulk = mutation({
  args: { key: v.string(), ids: v.array(v.id('leads')), action: v.union(v.literal('status'), v.literal('delete')), status: v.optional(leadStatus) },
  handler: async (ctx, { key, ids, action, status }) => {
    requireKey(key);
    if (ids.length > 200) throw new Error('too many leads at once');
    for (const id of ids) {
      const lead = await ctx.db.get(id);
      if (!lead) continue;
      if (action === 'delete') await ctx.db.delete(id);
      else if (status) {
        const next: Record<string, unknown> = { status, updatedAt: Date.now() };
        if (status !== 'new' && status !== 'spam' && !lead.contactedAt) next.contactedAt = Date.now();
        await ctx.db.patch(id, next);
      }
    }
    await logAudit(ctx, 'lead.bulk', action, `${action === 'delete' ? 'נמחקו' : `סטטוס ${status} ל־`} ${ids.length} לידים`);
  },
});
