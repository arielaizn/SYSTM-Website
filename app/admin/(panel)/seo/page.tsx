import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { IndexNowButton } from '../../../../components/admin/IndexNowButton';
import { adminQuery } from '../../../../lib/admin-api';
import { site } from '../../../../lib/config';
import { articles as builtInArticles } from '../../../../lib/content';
import { auditArticles, auditPages, keywordConflicts, linkSuggestions, siteHealth, type AuditArticle, type AuditPage } from '../../../../lib/seo-audit';
import { pageText, parseBlocks } from '../../../../lib/landing';
import { sectionsToHtml } from '../../../../lib/sanitize';

async function safe<T>(f: () => Promise<T>, d: T): Promise<T> {
  try {
    return await f();
  } catch {
    return d;
  }
}

export default async function SeoPage() {
  const [docs, svc, pgs] = await Promise.all([
    safe(() => adminQuery(api.articles.list, {}), null),
    safe(() => adminQuery(api.services.list, {}), null),
    safe(() => adminQuery(api.pages.list, {}), null),
  ]);
  const articles: AuditArticle[] = docs
    ? docs.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, status: a.status, bodyHtml: a.body ?? sectionsToHtml(a.sections), seoTitle: a.seoTitle, seoDescription: a.seoDescription, focusKeyword: a.focusKeyword }))
    : builtInArticles.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, status: 'published' as const, bodyHtml: sectionsToHtml(a.sections.map(([h, t]) => ({ h, t }))) }));
  const pages: AuditPage[] = [];
  for (const p of pgs ?? []) {
    const full = await safe(() => adminQuery(api.pages.get, { id: p._id }), null);
    if (!full) continue;
    const blocks = parseBlocks(full.blocks);
    pages.push({ slug: p.slug, title: p.title, status: p.status, seoTitle: p.seoTitle, seoDescription: p.seoDescription, noindex: p.noindex, text: pageText(blocks), blocks: blocks.map((b) => ({ type: b.type, props: b.props as unknown as Record<string, unknown> })) });
  }
  const rows = [...auditArticles(articles), ...auditPages(pages)].sort((a, b) => a.score - b.score);
  const conflicts = keywordConflicts(articles);
  const suggestions = linkSuggestions(articles, (svc ?? []).map((s) => ({ slug: s.slug, label: s.label })));
  const keyOk = /^[A-Za-z0-9-]{8,128}$/.test(process.env.INDEXNOW_KEY ?? '');
  const health = siteHealth({ siteUrl: site.siteUrl, indexNowKey: keyOk });
  const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0;
  const editHref = (r: (typeof rows)[number]) => (r.kind === 'guide' ? `/admin/articles` : `/admin/pages`);

  return (
    <>
      <PageTop title="קידום SEO" subtitle="מצב האתר מול גוגל: ציון לכל עמוד, התנגשויות בין מדריכים והצעות לקישורים פנימיים." />
      <div className="ad-editor">
        <div className="ad-card">
          <div className="ad-card__head">
            <h2>בריאות האתר</h2>
            <span className="ad-badge" data-s={health.every((h) => h.ok) ? 'published' : 'draft'}>{health.filter((h) => h.ok).length}/{health.length}</span>
          </div>
          <ul className="seo-checks">
            {health.map((c) => (
              <li key={c.id} data-ok={c.ok}><span aria-hidden="true">{c.ok ? '✓' : '○'}</span><div>{c.label}{c.ok ? null : <small>{c.tip}</small>}</div></li>
            ))}
          </ul>
          <div className="ad-actions" style={{ marginTop: 14 }}>
            <IndexNowButton disabled={!keyOk || !site.siteUrl} />
            {site.siteUrl ? <a className="ad-btn" href="/sitemap.xml" target="_blank" rel="noopener noreferrer">sitemap.xml</a> : null}
            {site.siteUrl ? <a className="ad-btn" href="/robots.txt" target="_blank" rel="noopener noreferrer">robots.txt</a> : null}
          </div>
          <p className="lb-hint" style={{ marginTop: 10 }}>גוגל עצמו לא תומך ב־IndexNow: מוסיפים את האתר ב־Google Search Console ושולחים שם את ה־sitemap פעם אחת.</p>
        </div>

        <div className="ad-card">
          <div className="ad-card__head">
            <h2>ציון לפי עמוד</h2>
            <p>ממוצע {avg} · {rows.length} עמודים</p>
          </div>
          {rows.length === 0 ? <p className="lb-hint">אין עדיין מדריכים או דפי נחיתה לבדיקה.</p> : null}
          <div className="ad-list">
            {rows.map((r) => (
              <div className="ad-item" key={`${r.kind}-${r.slug}`}>
                <div className="ad-item__main">
                  <Link href={editHref(r)}><b>{r.title}</b></Link>
                  <small dir="ltr" style={{ textAlign: 'start' }}>{r.url} · {r.kind === 'guide' ? 'מדריך' : 'דף נחיתה'}{r.published ? '' : ' · טיוטה'}</small>
                  {r.issues.length ? <small>לתיקון: {r.issues.slice(0, 3).map((i) => i.label).join(' · ')}</small> : null}
                </div>
                <span className="ad-badge" data-s={r.score >= 80 ? 'published' : 'draft'}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>

        {conflicts.length ? (
          <div className="ad-card">
            <div className="ad-card__head"><h2>מדריכים שמתחרים זה בזה</h2></div>
            <ul className="seo-checks">
              {conflicts.map((c) => (
                <li key={c.keyword} data-ok="false"><span aria-hidden="true">!</span><div>מילת המפתח "{c.keyword}" מוגדרת ב־{c.slugs.length} מדריכים ({c.slugs.join(', ')})<small>גוגל יבחר אחד ויחליש את האחרים. עדיף מילת מפתח שונה לכל מדריך.</small></div></li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="ad-card">
          <div className="ad-card__head"><h2>קישורים פנימיים מוצעים</h2><p>{suggestions.length} הצעות</p></div>
          {suggestions.length === 0 ? <p className="lb-hint">אין הצעות כרגע. קישורים פנימיים מאיצים סריקה ומחלקים סמכות בין העמודים.</p> : null}
          <ul className="seo-checks">
            {suggestions.map((s) => (
              <li key={`${s.fromSlug}-${s.toSlug}`} data-ok="false"><span aria-hidden="true">→</span><div>במדריך "{s.fromTitle}" לקשר אל "{s.toTitle}"<small dir="auto">{s.reason} · {s.toPath}</small></div></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
