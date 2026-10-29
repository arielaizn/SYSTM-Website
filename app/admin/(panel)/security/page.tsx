import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { SignOutEverywhere } from '../../../../components/admin/DataTools';
import { InstallApp, PushToggle } from '../../../../components/admin/Pwa';
import { adminQuery } from '../../../../lib/admin-api';
import { fmtDate } from '../../../../lib/format';

export default async function SecurityPage() {
  const log = (await adminQuery(api.system.auditList, { limit: 200 })).filter((r) => r.action === 'login' || r.action === 'logout' || r.action === 'security.signout-all').slice(0, 8);
  const hashed = Boolean(process.env.ADMIN_PASSWORD_HASH);
  return (
    <>
      <PageTop title="אבטחה והתראות" subtitle="התקנה כאפליקציה, התראה על כל ליד חדש, ואיך הכניסה מוגנת." />
      <div className="ad-grid" style={{ gap: 16, maxWidth: 920 }}>
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>אפליקציה והתראות</h2>
          </div>
          <p style={{ color: 'var(--ad-muted)', fontSize: 14, marginBottom: 14 }}>מתקינים את הניהול על המסך הראשי, ומקבלים התראה בטלפון ברגע שליד נכנס. כל מכשיר מגדיר לעצמו.</p>
          <div className="ad-row">
            <InstallApp />
            <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
          </div>
        </section>
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>כניסות אחרונות</h2>
          </div>
          <div className="ad-list">
            {log.length === 0 ? <p style={{ color: 'var(--ad-muted)' }}>עוד אין נתונים.</p> : null}
            {log.map((r) => (
              <div className="ad-item" key={r._id}>
                <div className="ad-item__main">
                  <b>{r.summary}</b>
                  <small>{fmtDate(r.at)}</small>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--ad-muted)', fontSize: 13, marginTop: 12 }}>אם יש כניסה שלא אתם עשיתם, צאו מכל המכשירים והחליפו את הסיסמה.</p>
          <div style={{ marginTop: 14 }}>
            <SignOutEverywhere />
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card__head">
            <h2>איך זה עובד</h2>
          </div>
          <dl className="ad-kv">
            <dt>סיסמה</dt>
            <dd>{hashed ? 'נשמרת כ־hash (scrypt), לא כטקסט.' : 'נשמרת כטקסט במשתנה סביבה. לשימוש מקומי בלבד. בפרודקשן עדיף hash: npm run admin:hash'}</dd>
            <dt>עוגיית כניסה</dt>
            <dd>חתומה, httpOnly, SameSite=Strict, תקפה ל־/admin בלבד ולמשך 12 שעות.</dd>
            <dt>ניסיונות כניסה</dt>
            <dd>חמישה כישלונות מכתובת אחת נועלים אותה ל־15 דקות. ההגבלה בזיכרון של שרת אחד.</dd>
            <dt>גישה לנתונים</dt>
            <dd>כל פעולה עוברת דרך שרת האתר עם מפתח סודי ל־Convex. הדפדפן לא מכיר את המפתח ולא פונה ל־Convex ישירות בשביל הניהול.</dd>
            <dt>חיפוש בגוגל</dt>
            <dd>כל /admin מסומן noindex, וגם חסום ב־robots.</dd>
          </dl>
        </section>
      </div>
    </>
  );
}
