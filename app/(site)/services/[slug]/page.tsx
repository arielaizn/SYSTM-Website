import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { ServiceDiagram } from '../../../../components/diagrams/Diagrams';
import { Cta, Faq, PageHero, SectionHead } from '../../../../components/sections/Shared';
import { Btn } from '../../../../components/ui/Btn';
import { ArrowUpLeft } from '../../../../components/ui/Icons';
import { SmartLink } from '../../../../components/ui/SmartLink';
import { getContent, serviceBySlug } from '../../../../lib/content-source';
import { rv } from '../../../../lib/reveal';
import { breadcrumbSchema, faqSchema, JsonLd, pageMeta, serviceSchema } from '../../../../lib/seo';

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getContent()).services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const s = serviceBySlug(await getContent(), slug);
  if (!s) return {};
  return pageMeta({ title: s.label, description: s.meta, path: `/services/${s.slug}/` });
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const content = await getContent();
  const s = serviceBySlug(content, slug);
  if (!s) notFound();
  const others = content.services.filter((x) => x.slug !== s.slug).slice(0, 3);
  const questions = [...s.faqs, ...content.faqs.slice(0, 2)] as [string, string][];

  return (
    <main id="main">
      <JsonLd
        data={[
          serviceSchema(s),
          faqSchema(questions),
          breadcrumbSchema([
            { name: 'SYSTM', path: '/' },
            { name: 'פתרונות', path: '/services/' },
            { name: s.label, path: `/services/${s.slug}/` },
          ]),
        ]}
      />

      <PageHero
        n={s.number}
        label={s.label}
        ghost={s.number}
        title={s.title}
        lead={s.intro}
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'פתרונות', href: '/services/' }, { label: s.label }]}
        actions={<Btn href={`/contact/?service=${s.slug}`}>בואו נבדוק התאמה</Btn>}
      />

      <section className="section container split">
        <div className="split__head">
          <SectionHead
            n="DELIVER"
            label="מה התהליך כולל"
            title={
              <>
                מגדירים נכון.
                <br />
                <em>בונים מדויק.</em>
              </>
            }
          />
          <div className="split__art lg lg--dense" data-reveal="">
            <ServiceDiagram slug={s.diagram} />
          </div>
        </div>
        <ol className="deliver">
          {s.items.map((t, i) => (
            <li key={t} className="deliver__row lg lg--dense" data-reveal="" style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <span className="deliver__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t}</h3>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container">
        <SectionHead
          n="EXAMPLE"
          label="המחשה של תהליך"
          title={
            <>
              ככה זה יכול
              <br />
              <em>להיראות בעבודה.</em>
            </>
          }
        />
        <ol className="flow">
          {s.example.map((t, i) => (
            <li key={t} className="flow__step lg lg--dense lg--pill" data-reveal="" style={{ '--d': `${i * 70}ms` } as CSSProperties}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {t}
            </li>
          ))}
        </ol>
        <p className="muted flow__note" {...rv(0)}>
          המחשה בלבד. התכנון בפועל נקבע אחרי מיפוי והרשאות.
        </p>
      </section>

      <section className="section container twocards">
        <article className="info lg lg--dense" data-reveal="">
          <h2 className="h-md">למי זה מתאים?</h2>
          <p>{s.fit}</p>
        </article>
        <article className="info lg lg--dense" data-reveal="" style={{ '--d': '80ms' } as CSSProperties}>
          <h2 className="h-md">עם מה יוצאים?</h2>
          <p>{s.outcome}</p>
        </article>
      </section>

      <section className="section container">
        <SectionHead n="FAQ" label="שאלות נפוצות" title={<>לפני שמתחילים.</>} />
        <Faq items={questions} />
      </section>

      <section className="section container">
        <SectionHead
          n="MORE"
          label="עוד בתחום"
          title={
            <>
              אולי גם
              <br />
              <em>זה מתאים.</em>
            </>
          }
        />
        <div className="related">
          {others.map((o, i) => (
            <SmartLink key={o.slug} href={`/services/${o.slug}/`} className="related__card lg lg--dense" data-reveal="" style={{ '--d': `${i * 70}ms` } as CSSProperties}>
              <span className="bento__num">{o.number}</span>
              <h3 className="h-md">{o.label}</h3>
              <p className="muted">{o.short}</p>
              <span className="bento__more">
                לפרטים <ArrowUpLeft />
              </span>
            </SmartLink>
          ))}
        </div>
      </section>

      <Cta />
    </main>
  );
}
