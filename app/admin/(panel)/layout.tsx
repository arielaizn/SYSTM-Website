import type { ReactNode } from 'react';
import { api } from '../../../convex/_generated/api';
import { AdminShell } from '../../../components/admin/AdminShell';
import { adminQuery } from '../../../lib/admin-api';
import { requireAdmin } from '../../../lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const stats = await adminQuery(api.leads.stats, {}).catch(() => null);
  return <AdminShell newLeads={stats?.byStatus.new ?? 0}>{children}</AdminShell>;
}
