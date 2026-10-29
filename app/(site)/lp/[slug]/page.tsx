import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockView } from '../../../../components/landing/BlockView';
import { getLandingPage } from '../../../../lib/landing-source';
import { pageText } from '../../../../lib/landing';
import { faqSchema, JsonLd, pageMeta } from '../../../../lib/seo';

type Params = { slug: string };

async function load(slug: string) {
  try {
    return await getLandingPage(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return {};
  const description = p.seoDescription || pageText(p.blocks).slice(0, 155);
  return { ...pageMeta({ title: p.seoTitle || p.title, description, path: `/lp/${p.slug}/`, image: p.ogImage }), ...(p.noindex ? { robots: { index: false, follow: false } } : {}) };
}

export default async function LandingRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const faqs = p.blocks.flatMap((b) => (b.type === 'faq' && !b.hidden ? b.props.items.filter((i) => i.q && i.a).map((i) => [i.q, i.a] as const) : []));
  return (
    <main id="main" className="lp">
      {faqs.length ? <JsonLd data={faqSchema(faqs)} /> : null}
      {p.blocks.map((b) => (
        <BlockView key={b.id} block={b} slug={p.slug} />
      ))}
    </main>
  );
}
