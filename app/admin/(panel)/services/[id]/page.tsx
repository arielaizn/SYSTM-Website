import { notFound } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';
import { PageTop } from '../../../../../components/admin/AdminShell';
import { EMPTY_SERVICE, ServiceEditor } from '../../../../../components/admin/ServiceEditor';
import { adminQuery } from '../../../../../lib/admin-api';

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') {
    return (
      <>
        <PageTop title="שירות חדש" subtitle="ימלא את הכרטיס באתר ויפתח לו עמוד." />
        <ServiceEditor id={null} initial={EMPTY_SERVICE} />
      </>
    );
  }
  const doc = (await adminQuery(api.services.list, {})).find((s) => s._id === id);
  if (!doc) notFound();
  const { _id, _creationTime, order, updatedAt, ...data } = doc;
  void _id;
  void _creationTime;
  void order;
  void updatedAt;
  return (
    <>
      <PageTop title={doc.label} subtitle={`/services/${doc.slug}/`} />
      <ServiceEditor id={doc._id} initial={data} />
    </>
  );
}
