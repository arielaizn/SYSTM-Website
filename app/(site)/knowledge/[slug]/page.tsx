import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReadingProgress } from '../../../../components/sections/ReadingProgress';
import { Cta, PageHero } from '../../../../components/sections/Shared';
import { ArrowUpLeft } from '../../../../components/ui/Icons';
import { SmartLink } from '../../../../components/ui/SmartLink';
import { articleBySlug, getContent } from '../../../../lib/content-source';
import { rv } from '../../../../lib/reveal';
import { ArticleArt } from '../../../../components/sections/ArticleArt';
import { GuideReader } from '../../../../components/sections/GuideReader';
import { htmlToText, renderToc, sanitizeBody, withHeadingIds } from '../../../../lib/sanitize';
import { articleSchema, breadcrumbSchema, JsonLd, pageMeta } from '../../../../lib/seo';

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getContent()).articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = articleBySlug(await getContent(), slug);
  if (!a) return {};
  return pageMeta({ title: a.seoTitle || a.title, description: a.seoDescription || a.summary, path: `/knowledge/${a.slug}/`, type: 'article', image: a.ogImage, keywords: a.focusKeyword });
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { articles } = await getContent();
  const a = articleBySlug({ articles } as never, slug);
  if (!a) notFound();
  const next = articles[(articles.findIndex((x) => x.slug === a.slug) + 1) % articles.length];
  // Rich-text articles render their (re-sanitized) HTML; older ones keep the plain sections.
  const rich = a.body ? withHeadingIds(sanitizeBody(a.body)) : null;
  const richHtml = rich ? renderToc(rich.html, rich.outline) : '';
  const toc = rich ? rich.headings : a.sections.map(([h]) => h);
  const showToc = a.showToc !== false && toc.length > 1;
  // Read-aloud text: the title, then every block of the body (or of the plain sections) on its own line.
  const spoken = (rich ? htmlToText(rich.html.replace(/<div[^>]*data-type="toc"[^>]*><\/div>/g, '')) : a.sections.map(([h, t]) => `${h}\n${t}`).join('\n')).split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <main id="main">
      <ReadingProgress />
      <JsonLd
        data={[
          articleSchema(a),
          breadcrumbSchema([
            { name: 'SYSTM', path: '/' },
            { name: 'ידע מעשי', path: '/knowledge/' },
            { name: a.title, path: `/knowledge/${a.slug}/` },
          ]),
        ]}
      />
      <PageHero
        n="GUIDE"
        label={a.category}
        title={a.title}
        lead={a.summary}
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'ידע מעשי', href: '/knowledge/' }, { label: a.category }]}
        actions={<span className="article-meta">SYSTM · {a.read}</span>}
      />

      <article className={`container article${showToc ? '' : ' article--wide'}`} data-stage="reading">
        {showToc ? (
        <aside className="article__toc lg lg--dense" aria-label="תוכן עניינים" data-reveal="">
          <p>במדריך הזה</p>
          {toc.map((h, i) => (
            <a key={`${h}-${i}`} href={`#part-${i + 1}`}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {h}
            </a>
          ))}
        </aside>
        ) : null}
        <div className="article__body">
          <div className="cover-hero lg lg--dense art-hover" data-reveal="">
            <ArticleArt a={a} i={articles.findIndex((x) => x.slug === a.slug)} />
          </div>
          {a.narration !== false ? <GuideReader title={a.title} paragraphs={spoken} /> : null}
          {rich ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: richHtml }} />
          ) : (
            a.sections.map(([h, t], i) => (
              <section key={h} id={`part-${i + 1}`} {...rv(0)}>
                <h2 className="h-md">{h}</h2>
                <p>{t}</p>
              </section>
            ))
          )}
          <div className="article__next" {...rv(0)}>
            <SmartLink href="/knowledge/" className="text-link">
              חזרה לכל המדריכים <ArrowUpLeft />
            </SmartLink>
            <SmartLink href={`/knowledge/${next.slug}/`} className="text-link">
              המדריך הבא: {next.title} <ArrowUpLeft />
            </SmartLink>
          </div>
        </div>
      </article>

      <Cta />
    </main>
  );
}
