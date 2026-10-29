import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditArticles, keywordConflicts, linkSuggestions, siteHealth } from '../lib/seo-audit.ts';

const art = (o: Partial<Parameters<typeof auditArticles>[0][number]> & { slug: string }) => ({ title: 'כותרת מדריך', summary: '', status: 'published' as const, bodyHtml: '', ...o });

test('articles that share a focus keyword are reported as competing', () => {
  const c = keywordConflicts([art({ slug: 'a', focusKeyword: 'אוטומציה לעסקים' }), art({ slug: 'b', focusKeyword: 'אוטומציה  לעסקים!' }), art({ slug: 'c', focusKeyword: 'סוכני ai' })]);
  assert.deepEqual(c, [{ keyword: 'אוטומציה לעסקים', slugs: ['a', 'b'] }]);
});

test('link suggestions skip existing links and the article itself', () => {
  const list = [
    art({ slug: 'a', title: 'איך בוחרים אוטומציה ראשונה', focusKeyword: 'אוטומציה ראשונה', bodyHtml: '<p>כדאי להכיר סוכן מול אוטומציה</p>' }),
    art({ slug: 'b', title: 'סוכן מול אוטומציה', bodyHtml: '<p>בחרו אוטומציה ראשונה קודם.</p><a href="/knowledge/a/">x</a>' }),
  ];
  const s = linkSuggestions(list, [{ slug: 'consulting', label: 'ייעוץ' }]);
  assert.deepEqual(s.map((x) => `${x.fromSlug}->${x.toSlug}`), ['a->b']);
});

test('audit sorts issues by weight and marks drafts', () => {
  const [row] = auditArticles([art({ slug: 'x', status: 'draft' })]);
  assert.equal(row.published, false);
  assert.ok(row.issues.length > 3 && row.issues[0].weight >= row.issues[row.issues.length - 1].weight);
});

test('site health flags a missing site url', () => {
  assert.equal(siteHealth({ siteUrl: '', indexNowKey: false }).filter((c) => !c.ok).length, 3);
  assert.equal(siteHealth({ siteUrl: 'https://getsystm.com', indexNowKey: true }).every((c) => c.ok), true);
});
