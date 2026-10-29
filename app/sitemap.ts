import type { MetadataRoute } from 'next';
import { site } from '../lib/config';
import { getContent } from '../lib/content-source';
import { getLandingSlugs } from '../lib/landing-source';

// Empty until NEXT_PUBLIC_SITE_URL is set: no invented URLs (docs/07).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!site.siteUrl) return [];
  const { articles, services } = await getContent();
  const landing = (await getLandingSlugs()).filter((p) => !p.noindex);
  const routes = [
    '/',
    '/services/',
    ...services.map((s) => `/services/${s.slug}/`),
    '/process/',
    '/workshops/',
    '/about/',
    '/knowledge/',
    ...articles.map((a) => `/knowledge/${a.slug}/`),
    '/contact/',
    '/privacy/',
    '/accessibility/',
  ];
  const dates = new Map<string, number>([...articles.filter((a) => a.updatedAt).map((a) => [`/knowledge/${a.slug}/`, a.updatedAt!] as const), ...landing.map((p) => [`/lp/${p.slug}/`, p.updatedAt] as const)]);
  return [...routes, ...landing.map((p) => `/lp/${p.slug}/`)].map((r) => ({ url: `${site.siteUrl}${r}`, ...(dates.has(r) ? { lastModified: new Date(dates.get(r)!) } : {}), changeFrequency: r.startsWith('/lp/') || r.startsWith('/knowledge/') ? 'weekly' : 'monthly', priority: r === '/' ? 1 : r.startsWith('/lp/') ? 0.8 : 0.7 }));
}
