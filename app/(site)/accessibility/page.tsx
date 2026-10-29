import type { Metadata } from 'next';
import { PageHero } from '../../../components/sections/Shared';
import { ArrowUpLeft } from '../../../components/ui/Icons';
import { SmartLink } from '../../../components/ui/SmartLink';
import { rv } from '../../../lib/reveal';
import { breadcrumbSchema, JsonLd, pageMeta } from '../../../lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'מידע על נגישות',
  description: 'אפשרויות נגישות באתר SYSTM: ניווט במקלדת, כיבוי אנימציות והתאמה להעדפות המערכת.',
  path: '/accessibility/',
});

export default function AccessibilityPage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbSchema([{ name: 'SYSTM', path: '/' }, { name: 'נגישות', path: '/accessibility/' }])} />
      <PageHero
        n="ACCESS"
        label="נגישות"
        title={
          <>
            אתר שאפשר
            <br />
            <em>להשתמש בו.</em>
          </>
        }
        lead="האתר נבנה לקריאה נוחה, לניווט במקלדת ולהתאמת התנועה להעדפות שלכם."
        crumbs={[{ label: 'SYSTM', href: '/' }, { label: 'נגישות' }]}
      />
      <section className="section container legal" data-stage="reading">
        <div {...rv(0)}>
          <h2 className="h-md">ניווט ושימוש</h2>
          <p>אפשר להגיע לתוכן הראשי דרך קישור הדילוג בתחילת העמוד, לנווט בקישורים ובטופס עם המקלדת, ולהגדיל את התצוגה בדפדפן. לשדות הטופס יש תוויות והודעות שגיאה.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">אנימציות</h2>
          <p>אפשר לכבות את התנועה בכפתור שבכותרת האתר. האתר מכבד גם את הגדרת הפחתת התנועה של מערכת ההפעלה. כשהתנועה כבויה כל התוכן נשאר גלוי, והרקע התלת־ממדי מפסיק לזוז. התוכן זמין גם כש־JavaScript כבוי.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">רקע וגרפיקה</h2>
          <p>הזכוכית התלת־ממדית ברקע, והדיאגרמות באתר, הן עיטור. אין בהן מידע שלא מופיע גם בטקסט.</p>
        </div>
        <div {...rv(0)}>
          <h2 className="h-md">משוב</h2>
          <p>אם נתקלתם בקושי, כתבו לנו איזה עמוד זה היה, מה ניסיתם לעשות ובאיזה דפדפן. זה יעזור לבדוק את התקלה.</p>
          <SmartLink href="/contact/" className="text-link">
            יצירת קשר בנושא נגישות <ArrowUpLeft />
          </SmartLink>
        </div>
      </section>
    </main>
  );
}
