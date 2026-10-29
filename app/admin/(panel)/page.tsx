import Link from 'next/link';
import { api } from '../../../convex/_generated/api';
import { Charts } from './charts-wrapper';
import { Icon } from '../../../components/admin/Icon';
import { PageTop } from '../../../components/admin/AdminShell';
import { SeedButton } from '../../../components/admin/SeedButton';
import { adminQuery } from '../../../lib/admin-api';
import { getContent } from '../../../lib/content-source';
import { STATUS_LABEL, timeAgo } from '../../../lib/format';

export default async function DashboardPage() {
  const [stats, leads, status, content] = await Promise.all([
    adminQuery(api.leads.stats, {}),
    adminQuery(api.leads.list, { status: 'all' }),
    adminQuery(api.system.status, {}),
    getContent(),
  ]);
  const label = (slug: string) => content.services.find((s) => s.slug === slug)?.label ?? (slug === 'not-sure' ? 'עדיין לא בטוחים' : slug);
  const recent = leads.filter((l) => l.status !== 'spam').slice(0, 7);
  const stale = leads.filter((l) => l.status === 'new' && Date.now() - l.createdAt > 24 * 3_600_000);

  return (
    <>
      <PageTop title="סקירה" subtitle={new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long' })}>
        <Link href="/admin/leads?status=new" className="ad-btn ad-btn--primary">
          <Icon name="inbox" />
          לידים חדשים{stats.byStatus.new ? ` (${stats.byStatus.new})` : ''}
        </Link>
      </PageTop>

      <div className="ad-grid" style={{ gap: 16 }}>
        {!status.seeded ? (
          <div className="ad-hint">
            <span>האתר משתמש כרגע בתוכן המובנה, ולכן אי אפשר לערוך אותו מכאן. ייבוא חד־פעמי מעביר אותו למערכת בלי לשנות איך האתר נראה.</span>
            <SeedButton />
          </div>
        ) : null}

        {stale.length > 0 ? (
          <div className="ad-hint ad-hint--warn">
            <span>{stale.length === 1 ? 'ליד אחד מחכה' : `${stale.length} לידים מחכים`} יותר מ־24 שעות בלי מענה.</span>
            <Link href="/admin/leads?status=new" className="ad-btn ad-btn--sm">
              לטיפול
            </Link>
          </div>
        ) : null}

        <div className="ad-grid ad-grid--4">
          <div className="ad-card ad-stat ad-stat--hot">
            <span>ממתינים לטיפול</span>
            <b>{stats.byStatus.new}</b>
            <small>לידים בסטטוס חדש</small>
          </div>
          <div className="ad-card ad-stat">
            <span>ב־7 הימים האחרונים</span>
            <b>{stats.last7}</b>
            <small>{stats.last30} ב־30 ימים</small>
          </div>
          <div className="ad-card ad-stat">
            <span>אחוז סגירה</span>
            <b>{stats.winRate}%</b>
            <small>
              {stats.byStatus.won} נסגרו מתוך {stats.real}
            </small>
          </div>
          <div className="ad-card ad-stat">
            <span>זמן עד מענה ראשון</span>
            <b>{stats.avgFirstContactHours === null ? '–' : `${stats.avgFirstContactHours}`}</b>
            <small>{stats.avgFirstContactHours === null ? 'עוד אין נתונים' : 'שעות בממוצע'}</small>
          </div>
        </div>

        <div className="ad-grid ad-grid--main">
          <section className="ad-card" aria-labelledby="d-daily">
            <div className="ad-card__head">
              <h2 id="d-daily">פניות חדשות ביום</h2>
              <p>30 ימים אחרונים</p>
            </div>
            <Charts.Daily data={stats.daily} />
          </section>
          <section className="ad-card" aria-labelledby="d-funnel">
            <div className="ad-card__head">
              <h2 id="d-funnel">איפה הלידים עומדים</h2>
            </div>
            <Charts.Funnel byStatus={stats.byStatus} />
          </section>
        </div>

        <div className="ad-grid ad-grid--main">
          <section className="ad-card" aria-labelledby="d-recent">
            <div className="ad-card__head">
              <h2 id="d-recent">פניות אחרונות</h2>
              <Link href="/admin/leads" className="ad-btn ad-btn--sm ad-btn--ghost">
                לכולן
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="ad-empty">
                <Icon name="inbox" width={28} height={28} />
                <b>עוד אין פניות</b>
                <span>כשמישהו ימלא את הטופס באתר, הפנייה תופיע כאן. אפשר גם להוסיף ליד ידנית.</span>
              </div>
            ) : (
              <div className="ad-list">
                {recent.map((l) => (
                  <Link key={l._id} href={`/admin/leads?open=${l._id}`} className="ad-item">
                    <div className="ad-item__main">
                      <b>{l.name}</b>
                      <small>
                        {label(l.service)} · {timeAgo(l.createdAt)}
                      </small>
                    </div>
                    <span className="ad-badge" data-s={l.status}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="ad-card" aria-labelledby="d-service">
            <div className="ad-card__head">
              <h2 id="d-service">מה מעניין את הפונים</h2>
            </div>
            <Charts.Services byService={stats.byService} labels={Object.fromEntries(Object.keys(stats.byService).map((k) => [k, label(k)]))} />
          </section>
        </div>
      </div>
    </>
  );
}
