import type { Metadata } from 'next';
import type { Article, Service } from './content';
import { absoluteUrl, site } from './config';
import type { Settings } from './content-source';

/** Per-page metadata. Canonical and og:url exist only once NEXT_PUBLIC_SITE_URL is set (docs/07). */
export function pageMeta({ title, description, path, type = 'website' }: { title: string; description: string; path: string; type?: 'website' | 'article' }): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: { title: `${title} | SYSTM`, description, type, locale: 'he_IL', siteName: 'SYSTM', ...(url ? { url, images: [{ url: absoluteUrl('/og.png'), width: 1200, height: 630, alt: 'SYSTM' }] } : {}) },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const withUrl = (path: string) => (site.siteUrl ? { url: absoluteUrl(path) } : {});

export const organizationSchema = (s: Pick<Settings, 'description' | 'phone' | 'email'>) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SYSTM',
  description: s.description,
  founder: { '@type': 'Person', name: site.founder },
  telephone: s.phone,
  ...(s.email ? { email: s.email } : {}),
  ...withUrl('/'),
  ...(site.siteUrl ? { logo: absoluteUrl('/icon-512.png') } : {}),
});

export const websiteSchema = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'SYSTM', inLanguage: 'he-IL', ...withUrl('/') });

export const faqSchema = (items: readonly (readonly [string, string])[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'he-IL',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

export const breadcrumbSchema = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, ...(site.siteUrl ? { item: absoluteUrl(t.path) } : {}) })),
});

export const serviceSchema = (s: Service) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: s.label,
  description: s.meta,
  inLanguage: 'he-IL',
  provider: { '@type': 'Organization', name: 'SYSTM' },
  ...withUrl(`/services/${s.slug}/`),
});

export const articleSchema = (a: Article) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.summary,
  inLanguage: 'he-IL',
  author: { '@type': 'Organization', name: 'SYSTM' },
  publisher: { '@type': 'Organization', name: 'SYSTM' },
  ...withUrl(`/knowledge/${a.slug}/`),
});
