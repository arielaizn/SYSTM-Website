import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Timestamps are milliseconds since epoch. Every table is read and written only through the functions in this
// folder, and every function except content:publicContent checks the shared ADMIN_API_KEY.
export default defineSchema({
  settings: defineTable({
    key: v.string(),
    phone: v.string(),
    phoneDisplay: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    description: v.string(),
    socials: v.array(v.object({ label: v.string(), href: v.string() })),
    banner: v.object({ enabled: v.boolean(), text: v.string(), href: v.string() }),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  services: defineTable({
    slug: v.string(),
    order: v.number(),
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
    faqs: v.array(v.object({ q: v.string(), a: v.string() })),
    diagram: v.string(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_order', ['order']),

  articles: defineTable({
    slug: v.string(),
    status: v.union(v.literal('draft'), v.literal('published')),
    category: v.string(),
    title: v.string(),
    summary: v.string(),
    read: v.string(),
    sections: v.array(v.object({ h: v.string(), t: v.string() })),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_status', ['status', 'publishedAt']),

  faqs: defineTable({
    order: v.number(),
    published: v.boolean(),
    q: v.string(),
    a: v.string(),
  }).index('by_order', ['order']),

  leads: defineTable({
    service: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    company: v.string(),
    message: v.string(),
    status: v.union(v.literal('new'), v.literal('contacted'), v.literal('qualified'), v.literal('won'), v.literal('lost'), v.literal('spam')),
    source: v.string(),
    tags: v.array(v.string()),
    notes: v.array(v.object({ at: v.number(), text: v.string() })),
    createdAt: v.number(),
    updatedAt: v.number(),
    contactedAt: v.optional(v.number()),
  })
    .index('by_created', ['createdAt'])
    .index('by_status', ['status', 'createdAt']),

  audit: defineTable({
    at: v.number(),
    action: v.string(),
    target: v.string(),
    summary: v.string(),
  }).index('by_at', ['at']),

  meta: defineTable({ key: v.string(), value: v.number() }).index('by_key', ['key']),

  // Web Push subscriptions of the admin's devices (one row per browser). Used to notify about new leads.
  pushSubs: defineTable({
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    label: v.string(),
    createdAt: v.number(),
  }).index('by_endpoint', ['endpoint']),
});
