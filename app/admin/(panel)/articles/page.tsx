import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { ArticlesList } from '../../../../components/admin/ContentLists';
import { Icon } from '../../../../components/admin/Icon';
import { SeedButton } from '../../../../components/admin/SeedButton';
import { adminQuery } from '../../../../lib/admin-api';

export default async function ArticlesAdminPage() {
  const [docs, status] = await Promise.all([adminQuery(api.articles.list, {}), adminQuery(api.system.status, {})]);
  return (
    <>
      <PageTop title="מדריכים" subtitle="הידע המעשי באתר. טיוטות לא מוצגות לגולשים.">
        <Link href="/admin/articles/new" className="ad-btn ad-btn--primary">
          <Icon name="plus" /> מדריך חדש
        </Link>
      </PageTop>
      {!status.seeded ? (
        <div className="ad-hint">
          <span>התוכן עוד לא יובא למערכת. הייבוא מעתיק את שלושת המדריכים הקיימים ופותח אותם לעריכה.</span>
          <SeedButton />
        </div>
      ) : docs.length === 0 ? (
        <div className="ad-card ad-empty">
          <b>אין מדריכים</b>
          <span>אפשר לכתוב את הראשון עכשיו.</span>
        </div>
      ) : (
        <ArticlesList docs={docs} />
      )}
    </>
  );
}
