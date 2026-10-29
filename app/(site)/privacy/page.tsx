import type { Metadata } from 'next';
import { PageHero } from '../../../components/sections/Shared';
import { ArrowUpLeft } from '../../../components/ui/Icons';
import { SmartLink } from '../../../components/ui/SmartLink';
import { site } from '../../../lib/config';
import { rv } from '../../../lib/reveal';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'מדיניות פרטיות',
  description: 'מה קורה עם הפרטים שמוזנים בטופס יצירת הקשר באתר SYSTM, ואילו נתונים נשמרים בדפדפן.',
  path: '/privacy/',
});

export default function PrivacyPage() {
  const webhook = site.contactMode === 'webhook';
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'פרטיות', path: '/privacy/' }])} />
      <PageHero
        n="INFO"
        label="פרטיות"
        title={
          <>
            הפרטים שלכם.
            <br />
            <em>בצורה ברורה.</em>
          </>
        }
        lead="העמוד מתאר את מצב האתר כפי שהוא היום."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'פרטיות' }]}
      />
      <section className="section container legal" data-stage="reading">
        <div {...rv(0)}>
          <h2 className="h-md">טופס יצירת הקשר</h2>
          {webhook ? (
            <p>
              כשמשלחים את הטופס, הפרטים שמילאתם (כיוון הפנייה, שם, טלפון, אימייל ושם עסק אם הוזנו, ותיאור הצורך) נשלחים לשרת האתר ונשמרים במערכת ניהול הפניות שלנו, ואם הוגדר גם בשירות שמקבל פניות. משתמשים בהם כדי לחזור אליכם בנושא הפנייה, ואפשר לבקש מחיקה בכל שלב.
            </p>
          ) : (
            <p>
              הטופס מכין הודעת WhatsApp עם הפרטים שמילאתם. ההודעה נפתחת ב־WhatsApp ואינה נשלחת עד שתבחרו לשלוח אותה שם. בשימוש הזה האתר לא שומר את תוכן הטופס בשום מסד נתונים.
            </p>
          )}
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">מטרת הפנייה</h2>
          <p>הפרטים משמשים למענה לפנייה ולבירור השירות שביקשתם. כדאי לא להזין מידע רגיש, או מידע שאין לכם רשות להעביר.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">שירותים חיצוניים</h2>
          <p>מעבר ל־WhatsApp או לקישור חיצוני כפוף גם למדיניות של השירות שאליו עוברים. ספק האחסון של האתר עשוי לעבד נתונים טכניים שנדרשים להפעלתו, כמו כתובת IP.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">העדפות תצוגה</h2>
          <p>אם תכבו את האנימציות, ההעדפה נשמרת בדפדפן שלכם בלבד, כדי להתאים את התצוגה בביקור הבא. באתר אין כלי פרסום או מדידת שימוש של צד שלישי.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">יצירת קשר</h2>
          <p>לשאלות על הפרטים שהעברתם אפשר ליצור קשר בטלפון שמופיע בעמוד הקשר.</p>
          <SmartLink href="/contact/" className="text-link">
            לעמוד הקשר <ArrowUpLeft />
          </SmartLink>
        </div>
      </section>
    </main>
  );
}
