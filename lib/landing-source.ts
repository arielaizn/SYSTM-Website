// Reads landing pages for the public site. Errors are thrown (not cached) so a Convex hiccup never turns a live page into a cached 404.
import { unstable_cache } from 'next/cache';
import { api } from '../convex/_generated/api';
import { adminKey, convexClient, convexConfigured, withTimeout } from './convex-server';
import { parseBlocks, type AnyBlock } from './landing';
import { sanitizeBody } from './sanitize';

export type LandingPage = { slug: string; title: string; blocks: AnyBlock[]; seoTitle?: string; seoDescription?: string; ogImage?: string; noindex: boolean; publishedAt?: number; updatedAt: number };

export const getLandingPage = (slug: string): Promise<LandingPage | null> =>
  unstable_cache(
    async () => {
      if (!convexConfigured() || adminKey().length < 24) return null;
      const doc = await withTimeout(convexClient().query(api.pages.bySlug, { key: adminKey(), slug }), 8000);
      if (!doc) return null;
      return { slug: doc.slug, title: doc.title, blocks: parseBlocks(doc.blocks, sanitizeBody), seoTitle: doc.seoTitle, seoDescription: doc.seoDescription, ogImage: doc.ogImage, noindex: doc.noindex ?? false, publishedAt: doc.publishedAt, updatedAt: doc.updatedAt };
    },
    ['landing-page', slug],
    { tags: ['content'], revalidate: 300 },
  )();

export async function getLandingSlugs(): Promise<{ slug: string; updatedAt: number; noindex: boolean }[]> {
  try {
    if (!convexConfigured() || adminKey().length < 24) return [];
    return await unstable_cache(async () => await withTimeout(convexClient().query(api.pages.publishedSlugs, { key: adminKey() }), 8000), ['landing-slugs'], { tags: ['content'], revalidate: 300 })();
  } catch {
    return [];
  }
}
