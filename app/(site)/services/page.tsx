import type { Metadata } from 'next';
import { Bento } from '../../../components/sections/Bento';
import { Paths } from '../../../components/sections/Paths';
import { Cta, PageHero } from '../../../components/sections/Shared';
import { Btn } from '../../../components/ui/Btn';
import { rv } from '../../../lib/reveal';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'הפתרונות של SYSTM',
  description: 'סוכני AI, אוטומציות, ייעוץ והדרכות בהתאמה לתהליך העסקי שלכם.',
  path: '/services/',
});

export default function ServicesPage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'פתרונות', path: '/services/' }])} />
      <PageHero
        n="01"
        label="הפתרונות"
        title={
          <>
            לא עוד אוסף כלים.
            <br />
            <em>מערכת שעובדת יחד.</em>
          </>
        }
        lead="בוחרים את הדרך לפי מה שצריך לקרות בעסק. כאן אפשר להתחיל להבין מה מתאים לכם."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'פתרונות' }]}
      />
      <section className="section container">
        <Bento />
        <p className="services-note muted" {...rv(0)}>
          לא בטוחים איפה להתחיל? שיחת מיפוי קצרה עוזרת לבחור תהליך אחד.
        </p>
        <div className="section-more">
          <Btn href="/contact/?service=not-sure" delay={80}>
            בואו נברר מה מתאים
          </Btn>
        </div>
      </section>
      <Paths />
      <Cta />
    </main>
  );
}
