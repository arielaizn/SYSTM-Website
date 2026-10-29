import type { MetadataRoute } from 'next';
import { site } from '../lib/config';

export default function robots(): MetadataRoute.Robots {
  if (!site.siteUrl) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/go/'] }, sitemap: `${site.siteUrl}/sitemap.xml` };
}
