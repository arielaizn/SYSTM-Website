import type { Metadata } from 'next';
import { ContactWizard } from '../../../components/contact/ContactWizard';
import { PageHero } from '../../../components/sections/Shared';
import { Phone, WhatsApp } from '../../../components/ui/Icons';
import { waLinkFor } from '../../../lib/config';
import { getContent } from '../../../lib/content-source';
import { rv } from '../../../lib/reveal';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'בואו נדבר',
  description: 'ספרו לנו מה מעכב את העבודה, ונתחיל במיפוי של תהליך אחד.',
  path: '/contact/',
});

export default async function ContactPage() {
  const { settings } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'יצירת קשר', path: '/contact/' }])} />
      <PageHero
        n="CONTACT"
        label="מתחילים בשיחה"
        title={
          <>
            הצעד הראשון
            <br />
            <em>הוא להבין.</em>
          </>
        }
        lead="ספרו לנו מה קורה בעסק, מה הייתם רוצים לשפר ואיפה אפשר להתחיל."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'יצירת קשר' }]}
      />

      <section className="section container contact" data-stage="reading">
        <aside className="contact__side">
          <h2 className="h-md" {...rv(0)}>
            לא צריך להגיע
            <br />
            עם אפיון מוכן.
          </h2>
          <p className="muted" {...rv(1)}>
            מספיק לדעת מה מפריע לכם בעבודה. משם אפשר להתחיל למפות.
          </p>
          <ul className="contact__steps" {...rv(2)}>
            <li>בוחרים כיוון לפנייה</li>
            <li>ממלאים פרטים קצרים</li>
            <li>ממשיכים להודעת WhatsApp אישית</li>
          </ul>
          <div className="contact__direct" {...rv(3)}>
            <a href={waLinkFor(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-link">
              <WhatsApp /> אפשר גם ישירות בוואטסאפ
            </a>
            <a href={`tel:${settings.phone}`} className="contact__phone ltr">
              <Phone /> {settings.phoneDisplay}
            </a>
          </div>
        </aside>
        <div className="wizard-card lg lg--dense" data-reveal="" data-refract="32">
          <ContactWizard />
        </div>
      </section>
    </main>
  );
}
