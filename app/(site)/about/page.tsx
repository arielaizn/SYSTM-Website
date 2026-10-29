import type { Metadata } from 'next';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { Cta, PageHero, SectionHead } from '../../../components/sections/Shared';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';
import { rv } from '../../../lib/reveal';

export const metadata: Metadata = pageMeta({
  title: 'על אריאל איזנשטט ו־SYSTM',
  description: 'יזם, יוצר תוכן ומרצה ל־AI. מייסד PixMind Studio ומוביל SYSTM: סוכנים, אוטומציות, הדרכה והטמעה בעסקים.',
  path: '/about/',
});

const beliefs = [
  'קודם העבודה, אחר כך הכלי.',
  'תהליך אחד שעובד שווה יותר מחמישה רעיונות.',
  'לכל מערכת יש בעלים, ומישהו שיכול לעצור אותה.',
  'מה שאי אפשר למדוד, לא מבטיחים.',
];

export default function AboutPage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'אודות', path: '/about/' }])} />
      <PageHero
        n="ABOUT"
        label="נעים להכיר"
        title={
          <>
            אריאל איזנשטט.
            <br />
            <em>בין רעיון לביצוע.</em>
          </>
        }
        lead="יזם, יוצר תוכן ומרצה ל־AI. מייסד PixMind Studio ומוביל SYSTM."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'אודות' }]}
      />

      <section className="section container editorial">
        <p className="editorial__big display" {...rv(0)}>
          להבין.
          <br />
          לבנות.
          <br />
          <em>לעשות.</em>
        </p>
        <div className="editorial__copy">
          <p {...rv(1)}>אני אריאל יהודה איזנשטט. אני יוצר ומלמד עם כלי AI, ומנסה לחבר בין מה שהטכנולוגיה יודעת לעשות לבין עבודה שקורית באמת בעסק.</p>
          <p {...rv(2)}>ב־PixMind Studio אני עושה תוכן, פרסומות וסרטונים עם AI. ב־SYSTM אני עובד על סוכנים, אוטומציות, הדרכה והטמעה.</p>
          <p {...rv(3)}>מה שמעניין אותי זה הרגע שבו הדגמה מרשימה הופכת למשהו שאפשר להפעיל ביום שני בבוקר. בשביל זה צריך תכנון, הבנה של הכלים ובדיקה של התוצאה.</p>
          <p {...rv(4)}>אני מסביר בשפה פשוטה, גם למי שלא טכני. מתחילים ממה שרוצים להשיג, ובונים משם.</p>
        </div>
      </section>

      <section className="section container">
        <figure className="identity lg lg--dense" data-reveal="">
          <Image src="/img/brand-applications.webp" alt="מערכת הזהות של SYSTM: סימן, פלטת צבעים, כרטיס ביקור ומכתב" width={1536} height={1024} sizes="(max-width: 900px) 100vw, 1200px" />
          <figcaption>SYSTM / AI SYSTEMS. REAL IMPACT.</figcaption>
        </figure>
      </section>

      <section className="section container" data-stage="faq">
        <SectionHead
          n="BELIEF"
          label="מה מוביל את העבודה"
          title={
            <>
              טכנולוגיה מעניינת.
              <br />
              <em>תוצאה מעניינת יותר.</em>
            </>
          }
        />
        <ol className="beliefs">
          {beliefs.map((b, i) => (
            <li key={b} className="beliefs__row lg lg--dense" data-reveal="" style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <p>{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <Cta />
    </main>
  );
}
