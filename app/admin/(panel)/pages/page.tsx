import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { Icon } from '../../../../components/admin/Icon';
import { PagesList } from '../../../../components/admin/PagesList';
import { adminQuery } from '../../../../lib/admin-api';

export default async function PagesAdmin() {
  let docs = null;
  try {
    docs = await adminQuery(api.pages.list, {});
  } catch {
    docs = null;
  }
  return (
    <>
      <PageTop title="דפי נחיתה" subtitle="בונים דף מבלוקים, מפרסמים ומקבלים לידים עם תיוג לפי דף.">
        {docs ? (
          <Link href="/admin/pages/new" className="ad-btn ad-btn--primary">
            <Icon name="plus" /> דף חדש
          </Link>
        ) : null}
      </PageTop>
      {!docs ? (
        <div className="ad-hint"><span>בונה הדפים עדיין לא פעיל בשרת. צריך לפרוס את פונקציות Convex החדשות (npx convex deploy).</span></div>
      ) : docs.length === 0 ? (
        <div className="ad-card ad-empty"><b>אין דפי נחיתה</b><span>אפשר להתחיל מתבנית או מדף ריק.</span></div>
      ) : (
        <PagesList docs={docs} />
      )}
    </>
  );
}
