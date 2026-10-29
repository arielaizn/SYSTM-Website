import type { MetadataRoute } from 'next';
import { site } from '../lib/config';
import { getContent } from '../lib/content-source';

// Empty until NEXT_PUBLIC_SITE_URL is set: no invented URLs (docs/07).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!site.siteUrl) return [];
  const { articles, services } = await getContent();
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
  return routes.map((r) => ({ url: `${site.siteUrl}${r}`, changeFrequency: 'monthly', priority: r === '/' ? 1 : 0.7 }));
}
