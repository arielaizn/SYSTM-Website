// Site-wide SEO audit: scores every published guide and landing page, flags keyword cannibalization and
// suggests internal links. Pure functions over plain data so node:test can run them.
import { landingChecks, seoChecks, seoScore, type SeoCheck } from './seo-score.ts';

export type AuditArticle = { slug: string; title: string; summary: string; status: 'draft' | 'published'; bodyHtml: string; seoTitle?: string; seoDescription?: string; focusKeyword?: string };
export type AuditPage = { slug: string; title: string; status: 'draft' | 'published'; seoTitle?: string; seoDescription?: string; noindex?: boolean; text: string; blocks: { type: string; props: Record<string, unknown> }[] };
export type AuditService = { slug: string; label: string };

export type Row = { kind: 'guide' | 'landing'; slug: string; title: string; url: string; score: number; issues: SeoCheck[]; published: boolean };
export type Suggestion = { fromSlug: string; fromTitle: string; toSlug: string; toTitle: string; toPath: string; reason: string };

const plain = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function auditArticles(list: AuditArticle[]): Row[] {
  return list.map((a) => {
    const checks = seoChecks({ title: a.title, summary: a.summary, slug: a.slug, seoTitle: a.seoTitle, seoDescription: a.seoDescription, focusKeyword: a.focusKeyword, bodyHtml: a.bodyHtml, bodyText: plain(a.bodyHtml) });
    return { kind: 'guide', slug: a.slug, title: a.title, url: `/knowledge/${a.slug}/`, score: seoScore(checks), issues: checks.filter((c) => !c.ok).sort((x, y) => y.weight - x.weight), published: a.status === 'published' };
  });
}

export function auditPages(list: AuditPage[]): Row[] {
  return list.map((p) => {
    const checks = landingChecks({ title: p.title, slug: p.slug, seoTitle: p.seoTitle, seoDescription: p.seoDescription, text: p.text, blocks: p.blocks });
    return { kind: 'landing', slug: p.slug, title: p.title, url: `/lp/${p.slug}/`, score: seoScore(checks), issues: checks.filter((c) => !c.ok).sort((x, y) => y.weight - x.weight), published: p.status === 'published' };
  });
}

/** Guides that target the same focus keyword compete with each other in Google. */
export function keywordConflicts(list: AuditArticle[]): { keyword: string; slugs: string[] }[] {
  const map = new Map<string, string[]>();
  for (const a of list) {
    const k = norm(a.focusKeyword ?? '');
    if (k.length > 1) map.set(k, [...(map.get(k) ?? []), a.slug]);
  }
  return [...map].filter(([, s]) => s.length > 1).map(([keyword, slugs]) => ({ keyword, slugs }));
}

/**
 * Internal link suggestions: when a guide's text mentions another guide's focus keyword (or title) or a service name,
 * and does not already link to it, suggest the link. Capped per guide so the list stays actionable.
 */
export function linkSuggestions(articles: AuditArticle[], services: AuditService[]): Suggestion[] {
  const out: Suggestion[] = [];
  const targets = [
    ...articles.filter((a) => a.status === 'published').map((a) => ({ slug: a.slug, title: a.title, path: `/knowledge/${a.slug}/`, phrases: [a.focusKeyword ?? '', a.title].map(norm).filter((p) => p.length >= 4) })),
    ...services.map((s) => ({ slug: s.slug, title: s.label, path: `/services/${s.slug}/`, phrases: [norm(s.label)].filter((p) => p.length >= 4) })),
  ];
  for (const a of articles) {
    if (a.status !== 'published') continue;
    const text = norm(plain(a.bodyHtml));
    let n = 0;
    for (const t of targets) {
      if (t.path === `/knowledge/${a.slug}/` || a.bodyHtml.includes(`href="${t.path}"`)) continue;
      const hit = t.phrases.find((p) => text.includes(p));
      if (hit && n < 3) {
        out.push({ fromSlug: a.slug, fromTitle: a.title, toSlug: t.slug, toTitle: t.title, toPath: t.path, reason: `הטקסט מזכיר "${hit}"` });
        n++;
      }
    }
  }
  return out;
}

export function siteHealth(env: { siteUrl: string; indexNowKey: boolean }) {
  return [
    { id: 'site-url', ok: !!env.siteUrl, label: 'כתובת האתר מוגדרת (NEXT_PUBLIC_SITE_URL)', tip: 'בלי זה האתר נשאר noindex, ה־robots חוסם את גוגל וה־sitemap ריק.' },
    { id: 'https', ok: env.siteUrl.startsWith('https://'), label: 'הכתובת ב־https', tip: 'גוגל מעדיף https.' },
    { id: 'indexnow', ok: env.indexNowKey, label: 'מפתח IndexNow מוגדר (INDEXNOW_KEY)', tip: 'מאפשר להודיע ל־Bing ול־Yandex על עמודים חדשים מיד.' },
  ];
}
