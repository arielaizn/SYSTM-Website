import { notFound } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';
import { PageTop } from '../../../../../components/admin/AdminShell';
import { ArticleEditor, EMPTY_ARTICLE } from '../../../../../components/admin/ArticleEditor';
import { adminQuery } from '../../../../../lib/admin-api';

export default async function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') {
    return (
      <>
        <PageTop title="מדריך חדש" subtitle="נשמר כטיוטה עד שמפרסמים." />
        <ArticleEditor id={null} initial={EMPTY_ARTICLE} />
      </>
    );
  }
  const doc = (await adminQuery(api.articles.list, {})).find((a) => a._id === id);
  if (!doc) notFound();
  return (
    <>
      <PageTop title={doc.title} subtitle={`/knowledge/${doc.slug}/`} />
      <ArticleEditor id={doc._id} initial={{ slug: doc.slug, status: doc.status, category: doc.category, title: doc.title, summary: doc.summary, read: doc.read, sections: doc.sections, body: doc.body, seoTitle: doc.seoTitle, seoDescription: doc.seoDescription, focusKeyword: doc.focusKeyword, ogImage: doc.ogImage }} />
    </>
  );
}
