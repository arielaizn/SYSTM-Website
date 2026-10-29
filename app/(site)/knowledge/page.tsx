import type { Metadata } from 'next';
import { KnowledgeList } from '../../../components/sections/KnowledgeList';
import { Cta, PageHero } from '../../../components/sections/Shared';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'ידע מעשי על סוכני AI ואוטומציות',
  description: 'מדריכים מקוריים: בחירת האוטומציה הראשונה, סוכן או אוטומציה, והגדרת פיילוט AI.',
  path: '/knowledge/',
});

export default function KnowledgePage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'ידע מעשי', path: '/knowledge/' }])} />
      <PageHero
        n="KNOWLEDGE"
        label="ידע מעשי"
        title={
          <>
            להבין את התהליך.
            <br />
            <em>לבחור את הצעד הבא.</em>
          </>
        }
        lead="מדריכים קצרים שמחברים בין רעיונות לבין החלטות בעבודה."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'ידע מעשי' }]}
      />
      <section className="section container">
        <KnowledgeList />
      </section>
      <Cta />
    </main>
  );
}
