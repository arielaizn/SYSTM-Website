import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { Icon, type IconName } from '../../../../components/admin/Icon';
import { adminQuery } from '../../../../lib/admin-api';
import { fmtDate, timeAgo } from '../../../../lib/format';

const ICON: Record<string, IconName> = { lead: 'inbox', leads: 'inbox', service: 'grid', article: 'doc', faq: 'question', settings: 'gear', content: 'data', login: 'key', logout: 'logout', security: 'shield' };

export default async function ActivityPage() {
  const rows = await adminQuery(api.system.auditList, { limit: 200 });
  return (
    <>
      <PageTop title="יומן פעולות" subtitle="כל שינוי בתוכן, בלידים ובהתחברות, מהחדש לישן." />
      {rows.length === 0 ? (
        <div className="ad-card ad-empty">
          <b>עוד אין פעולות</b>
        </div>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>מתי</th>
                <th>פעולה</th>
                <th>מה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} style={{ cursor: 'default' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {timeAgo(r.at)}
                    <small>{fmtDate(r.at)}</small>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ad-muted)' }}>
                      <Icon name={ICON[r.action.split('.')[0]] ?? 'pulse'} width={16} height={16} />
                      {r.action}
                    </span>
                  </td>
                  <td>{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
