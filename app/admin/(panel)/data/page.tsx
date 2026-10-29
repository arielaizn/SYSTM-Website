import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { ExportButton, ImportButton } from '../../../../components/admin/DataTools';
import { SeedButton } from '../../../../components/admin/SeedButton';
import { adminQuery } from '../../../../lib/admin-api';

export default async function DataPage() {
  const s = await adminQuery(api.system.status, {});
  return (
    <>
      <PageTop title="גיבוי וייבוא" subtitle="כל הנתונים שלכם בקובץ אחד, ואפשר להחזיר אותם." />
      <div className="ad-grid" style={{ gap: 16, maxWidth: 920 }}>
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>מה במערכת</h2>
          </div>
          <dl className="ad-kv">
            <dt>מקור התוכן באתר</dt>
            <dd>{s.seeded ? 'המערכת הזו (ניתן לעריכה)' : 'התוכן המובנה בקוד (עוד לא יובא)'}</dd>
            <dt>שירותים</dt>
            <dd>{s.services}</dd>
            <dt>מדריכים</dt>
            <dd>{s.articles}</dd>
            <dt>שאלות נפוצות</dt>
            <dd>{s.faqs}</dd>
            <dt>לידים</dt>
            <dd>{s.leads}</dd>
            <dt>רשומות ביומן</dt>
            <dd>{s.audit}</dd>
          </dl>
        </section>

        <section className="ad-card">
          <div className="ad-card__head">
            <h2>גיבוי</h2>
          </div>
          <p style={{ color: 'var(--ad-muted)', marginBottom: 14 }}>קובץ JSON עם ההגדרות, השירותים, המדריכים, השאלות וכל הלידים כולל ההערות. כדאי להוריד אחד לפני שינויים גדולים.</p>
          <div className="ad-actions">
            <ExportButton />
            <ImportButton kind="content" />
            <ImportButton kind="leads" />
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card__head">
            <h2>התוכן המקורי</h2>
          </div>
          <p style={{ color: 'var(--ad-muted)', marginBottom: 14 }}>
            {s.seeded ? 'מחזיר את השירותים, המדריכים, השאלות וההגדרות לנוסח שהאתר נשלח איתו. כל מה שערכתם יוחלף. לידים לא ייגעו.' : 'מעתיק את התוכן המובנה של האתר למערכת כדי שאפשר יהיה לערוך אותו. האתר ייראה אותו דבר.'}
          </p>
          <SeedButton label={s.seeded ? 'החזרה לתוכן המקורי' : 'ייבוא התוכן הקיים לעריכה'} replacing={s.seeded} />
        </section>
      </div>
    </>
  );
}
