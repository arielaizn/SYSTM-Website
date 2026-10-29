import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '../../../../lib/admin-session';
import { PENDING_COOKIE, verifyToken, type ClientPayload, type PendingRequest } from '../../../../lib/mcp/oauth';
import { decideOAuth } from '../actions';

export const dynamic = 'force-dynamic';

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="ad" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
    <main className="ad-card glow-frame" style={{ maxWidth: 520, width: '100%', display: 'grid', gap: 16 }}>
      {children}
    </main>
  </div>
);

export default async function ConsentPage() {
  if (!(await getSession())) redirect('/admin/login?next=/admin/oauth/consent');
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const pending = await verifyToken<PendingRequest>('pd', (await cookies()).get(PENDING_COOKIE)?.value, secret);
  const client = pending ? await verifyToken<ClientPayload>('cl', pending.cid, secret) : null;
  if (!pending || !client) {
    return (
      <Card>
        <h1 style={{ fontSize: 20 }}>הבקשה פגה</h1>
        <p>בקשת החיבור לא נמצאה או שחלפו 10 דקות. חזרו לאפליקציה (Claude, ChatGPT…) ולחצו שוב על "חיבור".</p>
      </Card>
    );
  }
  let host = '';
  try {
    host = new URL(pending.ru).host;
  } catch {
    host = pending.ru;
  }
  return (
    <Card>
      <h1 style={{ fontSize: 20 }}>לאשר לאפליקציה לנהל את האתר?</h1>
      <p>
        <b>{client.n}</b> מבקשת גישה מלאה לניהול האתר של SYSTM: לידים, שירותים, מדריכים, דפי נחיתה, קישורים קצרים, הגדרות ופרסום.
      </p>
      <p style={{ fontSize: 13, color: 'var(--ad-muted)' }}>
        אחרי האישור האפליקציה חוזרת אל <bdi dir="ltr">{host}</bdi>. מחיקות דורשות ממנה אישור מפורש נוסף. אפשר לנתק כל אפליקציה בכל רגע דרך "אבטחה והתראות" ← יציאה מכל המכשירים.
      </p>
      <form action={decideOAuth} style={{ display: 'flex', gap: 10 }}>
        <button type="submit" name="decision" value="approve" className="ad-btn ad-btn--primary">
          אישור וחיבור
        </button>
        <button type="submit" name="decision" value="deny" className="ad-btn">
          ביטול
        </button>
      </form>
    </Card>
  );
}
