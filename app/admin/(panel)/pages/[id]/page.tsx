import { notFound } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';
import { PageTop } from '../../../../../components/admin/AdminShell';
import { EMPTY_PAGE, LandingBuilder } from '../../../../../components/admin/LandingBuilder';
import { adminQuery } from '../../../../../lib/admin-api';
import { parseBlocks } from '../../../../../lib/landing';

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') {
    return (
      <>
        <PageTop title="דף נחיתה חדש" subtitle="נשמר כטיוטה עד שמפרסמים." />
        <LandingBuilder id={null} initial={EMPTY_PAGE} />
      </>
    );
  }
  let doc = null;
  try {
    doc = await adminQuery(api.pages.get, { id: id as never });
  } catch {
    doc = null;
  }
  if (!doc) notFound();
  return (
    <>
      <PageTop title={doc.title} subtitle={`/lp/${doc.slug}/`} />
      <LandingBuilder id={doc._id} initial={{ slug: doc.slug, title: doc.title, status: doc.status, blocks: parseBlocks(doc.blocks), seoTitle: doc.seoTitle, seoDescription: doc.seoDescription, ogImage: doc.ogImage, noindex: doc.noindex }} />
    </>
  );
}
