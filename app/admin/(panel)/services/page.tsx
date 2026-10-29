import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { ServicesList } from '../../../../components/admin/ContentLists';
import { Icon } from '../../../../components/admin/Icon';
import { SeedButton } from '../../../../components/admin/SeedButton';
import { adminQuery } from '../../../../lib/admin-api';

export default async function ServicesAdminPage() {
  const [docs, status] = await Promise.all([adminQuery(api.services.list, {}), adminQuery(api.system.status, {})]);
  return (
    <>
      <PageTop title="שירותים" subtitle="הכרטיסים, התפריט והעמוד של כל שירות.">
        <Link href="/admin/services/new" className="ad-btn ad-btn--primary">
          <Icon name="plus" /> שירות חדש
        </Link>
      </PageTop>
      {!status.seeded ? (
        <div className="ad-hint">
          <span>התוכן עוד לא יובא למערכת. הייבוא מעתיק את חמשת השירותים, המדריכים והשאלות כמו שהם ופותח אותם לעריכה.</span>
          <SeedButton />
        </div>
      ) : docs.length === 0 ? (
        <div className="ad-card ad-empty">
          <b>אין שירותים</b>
          <span>האתר מציג כרגע אזור ריק במקום השירותים. הוסיפו שירות, או שחזרו את התוכן המקורי.</span>
        </div>
      ) : (
        <ServicesList docs={docs} />
      )}
    </>
  );
}
