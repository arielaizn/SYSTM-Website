import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { ServiceDiagram } from '../../../components/diagrams/Diagrams';
import { Cta, PageHero, SectionHead } from '../../../components/sections/Shared';
import { Btn } from '../../../components/ui/Btn';
import { getContent } from '../../../lib/content-source';
import { rv } from '../../../lib/reveal';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'הרצאות וסדנאות AI',
  description: 'לומדים AI על משימות אמיתיות: סדנאות לצוותים וארגונים, והדרכת קלוד קוד ליוצרים ולעורכי וידאו.',
  path: '/workshops/',
});

export default async function WorkshopsPage() {
  const { services } = await getContent();
  const paths = ['workshops', 'claude-code'].map((slug) => services.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'סדנאות', path: '/workshops/' }])} />
      <PageHero
        n="LEARN"
        label="הרצאות וסדנאות"
        title={
          <>
            מפגש שנגמר
            <br />
            <em>עם משהו ביד.</em>
          </>
        }
        lead="הדרכות בשפה פשוטה, עם דוגמאות ותרגול שמחוברים לעבודה של המשתתפים."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'סדנאות' }]}
      />

      <section className="section container twocards twocards--tall">
        {paths.map((s, i) => (
          <article key={s.slug} className="info path lg lg--dense" data-reveal="" style={{ '--d': `${i * 80}ms` } as CSSProperties}>
            <div className="path__art">
              <ServiceDiagram slug={s.diagram} />
            </div>
            <span className="bento__num">{s.number}</span>
            <h2 className="h-md">{s.label}</h2>
            <p>{s.intro}</p>
            <Btn href={`/services/${s.slug}/`} variant="glass" noReveal>
              לפרטים על ההדרכה
            </Btn>
          </article>
        ))}
      </section>

      <section className="section container">
        <SectionHead
          n="ADAPT"
          label="התאמה לקהל"
          title={
            <>
              אותם כלים.
              <br />
              <em>משימות אחרות.</em>
            </>
          }
          intro="רמת ההיכרות, התפקידים של המשתתפים, סוגי הקבצים והמטרה של המפגש קובעים את התוכן. אין צורך לבחור מסלול לבד. אפשר להתחיל בשיחה."
        />
        <div className="section-more" style={{ marginTop: 0 }}>
          <Btn href="/contact/?service=workshops" delay={100}>
            נתאים מפגש לצוות
          </Btn>
        </div>
        <p className="muted services-note" {...rv(1)}>
          מחיר ומועדים נקבעים אחרי שמבינים את הקהל וההיקף.
        </p>
      </section>

      <Cta />
    </main>
  );
}
