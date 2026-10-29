import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { LeadsView } from '../../../../components/admin/LeadsView';
import { adminQuery } from '../../../../lib/admin-api';
import { getContent } from '../../../../lib/content-source';

const VALID = ['all', 'new', 'contacted', 'qualified', 'won', 'lost', 'spam'];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; open?: string }> }) {
  const { status = 'all', open } = await searchParams;
  const [leads, content] = await Promise.all([adminQuery(api.leads.list, {}), getContent()]);
  const labels = Object.fromEntries([...content.services.map((s) => [s.slug, s.label]), ['not-sure', 'עדיין לא בטוחים']]);
  return (
    <>
      <PageTop title="לידים" subtitle="כל מי שהשאיר פרטים באתר, ומה קורה איתו." />
      <LeadsView initial={leads} labels={labels} choices={content.contactChoices} initialStatus={VALID.includes(status) ? status : 'all'} openId={open} />
    </>
  );
}
