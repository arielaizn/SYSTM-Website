// Where the site's editable content comes from: Convex when it is configured and has been seeded, otherwise the
// built-in copy in lib/content.ts. Any failure falls back to the built-in copy, so the public site never breaks
// because the admin backend is down. Results are cached under the "content" tag; the admin purges it on save.
import { unstable_cache } from 'next/cache';
import { api } from '../convex/_generated/api';
import { site } from './config';
import { articles as defaultArticles, faqs as defaultFaqs, services as defaultServices, type Article, type DiagramId, type Service } from './content';
import { convexClient, convexConfigured, withTimeout } from './convex-server';

export type Settings = {
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  email: string;
  description: string;
  socials: { label: string; href: string }[];
  banner: { enabled: boolean; text: string; href: string };
};

export type Content = {
  source: 'convex' | 'defaults';
  settings: Settings;
  services: Service[];
  articles: Article[];
  faqs: [string, string][];
  contactChoices: { value: string; label: string }[];
};

export const defaultSettings: Settings = {
  phone: site.phone,
  phoneDisplay: site.phoneDisplay,
  whatsapp: site.whatsapp,
  email: site.email,
  description: site.description,
  socials: [...site.socials],
  banner: { enabled: false, text: '', href: '' },
};

export const contactChoicesFor = (services: Service[]) => [...services.map((s) => ({ value: s.slug, label: s.label })), { value: 'not-sure', label: 'רוצה להבין מה מתאים לי' }];

export function defaultContent(): Content {
  return {
    source: 'defaults',
    settings: defaultSettings,
    services: defaultServices,
    articles: defaultArticles,
    faqs: defaultFaqs,
    contactChoices: contactChoicesFor(defaultServices),
  };
}

type Remote = Awaited<ReturnType<ReturnType<typeof convexClient>['query']>> & Record<string, any>;

function fromRemote(r: Remote): Content | null {
  if (!r || !r.seeded) return null;
  const services: Service[] = (r.services as any[]).map((s) => ({
    slug: s.slug,
    diagram: s.diagram as DiagramId,
    number: s.number,
    label: s.label,
    short: s.short,
    title: s.title,
    intro: s.intro,
    meta: s.meta,
    items: s.items,
    example: s.example,
    fit: s.fit,
    outcome: s.outcome,
    faqs: (s.faqs as { q: string; a: string }[]).map((f) => [f.q, f.a] as [string, string]),
  }));
  const articles: Article[] = (r.articles as any[]).map((a) => ({
    slug: a.slug,
    category: a.category,
    title: a.title,
    summary: a.summary,
    read: a.read,
    sections: (a.sections as { h: string; t: string }[]).map((x) => [x.h, x.t] as [string, string]),
    body: a.body || undefined,
    seoTitle: a.seoTitle || undefined,
    seoDescription: a.seoDescription || undefined,
    focusKeyword: a.focusKeyword || undefined,
    ogImage: a.ogImage || undefined,
    coverStyle: a.coverStyle,
    coverSeed: a.coverSeed,
    narration: a.narration,
    showToc: a.showToc,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
  }));
  const s = r.settings as Settings | null;
  return {
    source: 'convex',
    settings: s
      ? { phone: s.phone, phoneDisplay: s.phoneDisplay, whatsapp: s.whatsapp, email: s.email, description: s.description, socials: s.socials, banner: s.banner }
      : defaultSettings,
    services,
    articles,
    faqs: (r.faqs as { q: string; a: string }[]).map((f) => [f.q, f.a] as [string, string]),
    contactChoices: contactChoicesFor(services),
  };
}

const fetchRemote = unstable_cache(
  async (): Promise<Content | null> => {
    if (!convexConfigured()) return null;
    try {
      const r = await withTimeout(convexClient().query(api.content.publicContent, {}), 4000);
      return fromRemote(r as Remote);
    } catch {
      return null;
    }
  },
  ['systm-content-v1'],
  { tags: ['content'], revalidate: 300 },
);

export async function getContent(): Promise<Content> {
  return (await fetchRemote()) ?? defaultContent();
}

export const serviceBySlug = (c: Content, slug: string) => c.services.find((s) => s.slug === slug);
export const articleBySlug = (c: Content, slug: string) => c.articles.find((a) => a.slug === slug);
