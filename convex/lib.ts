import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';

// Shared helpers and validators. This file exports no Convex functions.

/** Every admin function takes `key` and calls this first. The key lives in the Convex env and in the Next server env only. */
export function requireKey(key: string) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < 24) throw new Error('admin key is not configured');
  if (key.length !== expected.length) throw new Error('unauthorized');
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) throw new Error('unauthorized');
}

export async function logAudit(ctx: MutationCtx, action: string, target: string, summary: string) {
  await ctx.db.insert('audit', { at: Date.now(), action, target: target.slice(0, 120), summary: summary.slice(0, 300) });
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSlug(slug: string) {
  if (!SLUG.test(slug) || slug.length > 60) throw new Error('invalid slug');
}

export function assertMax(label: string, value: string, max: number) {
  if (value.length > max) throw new Error(`${label} is too long`);
}

export const qa = v.object({ q: v.string(), a: v.string() });

export const serviceData = v.object({
  slug: v.string(),
  published: v.boolean(),
  number: v.string(),
  label: v.string(),
  short: v.string(),
  title: v.string(),
  intro: v.string(),
  meta: v.string(),
  items: v.array(v.string()),
  example: v.array(v.string()),
  fit: v.string(),
  outcome: v.string(),
  faqs: v.array(qa),
  diagram: v.string(),
});

export const articleData = v.object({
  slug: v.string(),
  status: v.union(v.literal('draft'), v.literal('published')),
  category: v.string(),
  title: v.string(),
  summary: v.string(),
  read: v.string(),
  sections: v.array(v.object({ h: v.string(), t: v.string() })),
  body: v.optional(v.string()),
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
  focusKeyword: v.optional(v.string()),
  ogImage: v.optional(v.string()),
});

export const faqData = v.object({ q: v.string(), a: v.string(), published: v.boolean() });

export const settingsData = v.object({
  phone: v.string(),
  phoneDisplay: v.string(),
  whatsapp: v.string(),
  email: v.string(),
  description: v.string(),
  socials: v.array(v.object({ label: v.string(), href: v.string() })),
  banner: v.object({ enabled: v.boolean(), text: v.string(), href: v.string() }),
});

export const leadStatus = v.union(v.literal('new'), v.literal('contacted'), v.literal('qualified'), v.literal('won'), v.literal('lost'), v.literal('spam'));

export const DIAGRAMS = ['ai-agents', 'automation', 'consulting', 'workshops', 'claude-code'];

export function assertSafeHref(href: string) {
  if (href && !/^(\/(?!\/)|https:\/\/|mailto:|tel:)/.test(href)) throw new Error('href must be a site path or an https/mailto/tel link');
}

export function validateService(d: { slug: string; label: string; title: string; diagram: string; items: string[]; example: string[]; faqs: { q: string; a: string }[]; intro: string; short: string; meta: string; fit: string; outcome: string }) {
  assertSlug(d.slug);
  if (!d.label.trim() || !d.title.trim()) throw new Error('label and title are required');
  if (!DIAGRAMS.includes(d.diagram)) throw new Error('unknown diagram');
  if (d.items.length > 12 || d.example.length > 10 || d.faqs.length > 12) throw new Error('too many list items');
  for (const [k, s, m] of [['label', d.label, 80], ['title', d.title, 200], ['intro', d.intro, 800], ['short', d.short, 300], ['meta', d.meta, 300], ['fit', d.fit, 500], ['outcome', d.outcome, 500]] as const) assertMax(k, s, m);
}

export function validateArticle(d: { slug: string; title: string; summary: string; category: string; read: string; sections: { h: string; t: string }[]; body?: string; seoTitle?: string; seoDescription?: string; focusKeyword?: string; ogImage?: string }) {
  assertSlug(d.slug);
  if (!d.title.trim()) throw new Error('title is required');
  if (d.sections.length > 20) throw new Error('too many sections');
  assertMax('title', d.title, 200);
  assertMax('summary', d.summary, 500);
  assertMax('category', d.category, 60);
  assertMax('body', d.body ?? '', 200000);
  assertMax('seo title', d.seoTitle ?? '', 120);
  assertMax('seo description', d.seoDescription ?? '', 320);
  assertMax('focus keyword', d.focusKeyword ?? '', 80);
  if (d.ogImage) assertSafeHref(d.ogImage);
  for (const s of d.sections) {
    assertMax('section title', s.h, 200);
    assertMax('section text', s.t, 8000);
  }
}
