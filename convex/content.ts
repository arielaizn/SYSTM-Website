import { query } from './_generated/server';

const strip = <T extends { _id: unknown; _creationTime: number }>(doc: T) => {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
};

/**
 * The only function the public site calls without the admin key. It returns published content only.
 * `seeded` tells the site whether Convex is the source of truth yet; before that the site keeps using its built-in copy.
 */
export const publicContent = query({
  args: {},
  handler: async (ctx) => {
    const seeded = (await ctx.db.query('meta').withIndex('by_key', (q) => q.eq('key', 'seeded')).unique())?.value === 1;
    if (!seeded) return { seeded: false as const };
    const settings = await ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', 'site')).unique();
    const services = await ctx.db.query('services').withIndex('by_order').collect();
    const articles = await ctx.db.query('articles').withIndex('by_status', (q) => q.eq('status', 'published')).order('desc').collect();
    const faqs = await ctx.db.query('faqs').withIndex('by_order').collect();
    return {
      seeded: true as const,
      settings: settings ? strip(settings) : null,
      services: services.filter((s) => s.published).map(strip),
      articles: articles.map(strip),
      faqs: faqs.filter((f) => f.published).map(strip),
    };
  },
});
