import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { FaqsManager } from '../../../../components/admin/FaqsManager';
import { SeedButton } from '../../../../components/admin/SeedButton';
import { adminQuery } from '../../../../lib/admin-api';

export default async function FaqsAdminPage() {
  const [docs, status] = await Promise.all([adminQuery(api.faqs.list, {}), adminQuery(api.system.status, {})]);
  return (
    <>
      <PageTop title="שאלות נפוצות" subtitle="מוצגות בדף הבית ובעמודי השירות." />
      {!status.seeded ? (
        <div className="ad-hint" style={{ marginBottom: 16 }}>
          <span>התוכן עוד לא יובא למערכת. הייבוא מעתיק את שש השאלות הקיימות.</span>
          <SeedButton />
        </div>
      ) : (
        <FaqsManager docs={docs} />
      )}
    </>
  );
}
