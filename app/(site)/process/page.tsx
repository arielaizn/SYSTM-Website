import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Process } from '../../../components/sections/Process';
import { Cta, PageHero, SectionHead } from '../../../components/sections/Shared';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'איך עובדים יחד',
  description: 'מיפוי, תכנון, חיבור ושיפור. תהליך עבודה ברור להטמעת AI ואוטומציות, עם הרשאות, בקרה ותיעוד.',
  path: '/process/',
});

const controls = [
  ['הרשאות לפי תפקיד', 'מגדירים אילו פעולות מותר לבצע, על איזה מידע, ומה נשאר בידיים של אדם.'],
  ['נקודות אישור', 'לפני כל פעולה שיוצאת מהעסק, כמו שליחת הודעה או שינוי נתונים, יש שלב שבו מישהו מאשר.'],
  ['חריגים שמטופלים מראש', 'חסר מידע, מערכת לא זמינה, פנייה שלא מובנת. לכל אחד נכתב מה קורה.'],
  ['תיעוד והעברה לצוות', 'בסוף יש מסמך קצר ויומן פעולות, ומי שעובד עם התהליך יודע לעצור אותו ולהריץ אותו שוב.'],
] as const;

export default function ProcessPage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'איך עובדים', path: '/process/' }])} />
      <PageHero
        n="METHOD"
        label="תהליך העבודה"
        title={
          <>
            מהבעיה.
            <br />
            <em>לתהליך שעובד.</em>
          </>
        }
        lead="כל פרויקט מתחיל בהבנת העבודה, ומתקדם דרך החלטות שאפשר לבדוק."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'איך עובדים' }]}
      />

      <Process detailed withHead={false} />

      <section className="section container" data-stage="faq">
        <SectionHead
          n="CONTROL"
          label="בקרה ותיעוד"
          title={
            <>
              גם כשהכול
              <br />
              <em>לא הולך לפי התוכנית.</em>
            </>
          }
          intro="מתכננים מה קורה כשחסר מידע, כשמערכת לא זמינה וכשצריך אישור של אדם."
        />
        <div className="grid4">
          {controls.map(([h, p], i) => (
            <article key={h} className="info lg lg--dense" data-reveal="" style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <h3 className="h-md">{h}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>

      <Cta />
    </main>
  );
}
