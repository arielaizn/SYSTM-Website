// Pure formatting helpers shared by server and client admin code.
export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'לפני רגע';
  const m = Math.round(s / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  if (h < 24) return `לפני ${h} שעות`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? 'אתמול' : `לפני ${d} ימים`;
  return new Date(ts).toLocaleDateString('he-IL', { timeZone: TZ });
}

// Always Israel time. Without it the server (UTC on Vercel) and the browser format the same moment differently.
export const TZ = 'Asia/Jerusalem';
export const fmtDate = (ts: number) => new Date(ts).toLocaleString('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export const STATUS_LABEL: Record<string, string> = { new: 'חדש', contacted: 'נוצר קשר', qualified: 'מתאים', won: 'נסגר', lost: 'לא נסגר', spam: 'ספאם' };
export const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
