import { DailyBars, HBars } from '../../../components/admin/Charts';
import { STATUS_LABEL } from '../../../lib/format';

const COLOR: Record<string, string> = { new: 'var(--st-new)', contacted: 'var(--st-contacted)', qualified: 'var(--st-qualified)', won: 'var(--st-won)', lost: 'var(--st-lost)' };

/** Thin server wrappers that map lead stats into chart rows. */
export const Charts = {
  Daily: ({ data }: { data: { day: string; n: number }[] }) => <DailyBars data={data} />,
  Funnel: ({ byStatus }: { byStatus: Record<string, number> }) => (
    <HBars rows={(['new', 'contacted', 'qualified', 'won', 'lost'] as const).map((s) => ({ label: STATUS_LABEL[s], n: byStatus[s] ?? 0, color: COLOR[s] }))} />
  ),
  Services: ({ byService, labels }: { byService: Record<string, number>; labels: Record<string, string> }) => {
    const rows = Object.entries(byService)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ label: labels[k] ?? k, n }));
    return rows.length ? <HBars rows={rows} /> : <p style={{ color: 'var(--ad-muted)', fontSize: 14 }}>עוד אין נתונים.</p>;
  },
};
