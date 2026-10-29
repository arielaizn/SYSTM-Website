import type { Metadata } from 'next';
import { Approach } from '../../components/sections/Approach';
import { Bento } from '../../components/sections/Bento';
import { Founder } from '../../components/sections/Founder';
import { Guides } from '../../components/sections/Guides';
import { Hero } from '../../components/sections/Hero';
import { Process } from '../../components/sections/Process';
import { Rail } from '../../components/sections/Rail';
import { Cta, Faq, SectionHead } from '../../components/sections/Shared';
import { WorkflowDemo } from '../../components/sections/WorkflowDemo';
import { Btn } from '../../components/ui/Btn';
import { getContent } from '../../lib/content-source';
import { faqSchema, JsonLd, organizationSchema, websiteSchema } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    title: { absolute: 'SYSTM | פחות עומס. יותר עסק.' },
    description: settings.description,
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') + '/' } } : {}),
  };
}

export default async function Home() {
  const { settings, faqs } = await getContent();
  return (
    <main id="main">
      <JsonLd data={[organizationSchema(settings), websiteSchema(), faqSchema(faqs)]} />
      <Hero />
      <Rail />
      <Approach />

      <section className="section container" data-stage="solutions" aria-labelledby="sol-title">
        <SectionHead
          n="02"
          label="הפתרונות"
          title={
            <span id="sol-title">
              בונים סביב
              <br />
              <em>העבודה שלך.</em>
            </span>
          }
          intro="מתהליך אחד שחוזר על עצמו ועד מערכת שמחברת כמה חלקים בעסק."
        />
        <Bento />
      </section>

      <section className="section container" data-stage="demo" aria-labelledby="demo-title">
        <SectionHead
          n="03"
          label="מה צריך לקרות"
          title={
            <span id="demo-title">
              מפנייה ראשונה.
              <br />
              <em>עד הפעולה הבאה.</em>
            </span>
          }
          intro="המחשה של תהליך אפשרי. בוחרים תרחיש, ורואים איפה המערכת עובדת ואיפה אדם מאשר."
        />
        <WorkflowDemo />
      </section>

      <Process />
      <Founder />

      <section className="section container" data-stage="guides" aria-labelledby="guides-title">
        <SectionHead
          n="06"
          label="ידע מעשי"
          title={
            <span id="guides-title">
              לצאת עם
              <br />
              <em>כיוון ברור.</em>
            </span>
          }
          intro="מדריכים מקוריים להתחלת עבודה עם סוכנים, אוטומציות והטמעה."
        />
        <Guides />
        <div className="section-more">
          <Btn href="/knowledge/" variant="glass" delay={120}>
            לכל המדריכים
          </Btn>
        </div>
      </section>

      <section className="section container" data-stage="faq" aria-labelledby="faq-title">
        <SectionHead
          n="07"
          label="לפני שמתחילים"
          title={
            <span id="faq-title">
              כמה דברים
              <br />
              <em>ששווה לדעת.</em>
            </span>
          }
        />
        <Faq items={faqs} />
      </section>

      <Cta />
    </main>
  );
}
