import { headers } from 'next/headers';
import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { LinksManager } from '../../../../components/admin/LinksManager';
import { adminQuery } from '../../../../lib/admin-api';
import { site } from '../../../../lib/config';

export default async function LinksPage() {
  let docs = null;
  try {
    docs = await adminQuery(api.links.list, {});
  } catch {
    docs = null;
  }
  const h = await headers();
  const origin = site.siteUrl || `https://${h.get('host') ?? 'getsystm.com'}`;
  return (
    <>
      <PageTop title="קישורים קצרים" subtitle="קישור קצר לכל קמפיין, עם ספירת קליקים." />
      {docs ? <LinksManager docs={docs} origin={origin} /> : <div className="ad-hint"><span>מנוע הקישורים עדיין לא פעיל בשרת. צריך לפרוס את פונקציות Convex החדשות (npx convex deploy).</span></div>}
    </>
  );
}
