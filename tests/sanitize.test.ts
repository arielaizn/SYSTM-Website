import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyToSections, sanitizeBody, withHeadingIds } from '../lib/sanitize.ts';
import { seoChecks, seoScore } from '../lib/seo-score.ts';

test('scripts, event handlers and javascript: links are stripped', () => {
  const out = sanitizeBody('<p onclick="x()">hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><img src="x" onerror="alert(1)">');
  assert.ok(!/script|onclick|onerror|javascript:/i.test(out), out);
});

test('only https images and YouTube embeds survive', () => {
  assert.ok(!sanitizeBody('<img src="http://a.com/x.png">').includes('<img'));
  assert.ok(sanitizeBody('<img src="https://a.com/x.png" alt="x">').includes('<img'));
  assert.ok(!sanitizeBody('<iframe src="https://evil.com/embed/abc"></iframe>').includes('iframe'));
  assert.ok(sanitizeBody('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>').includes('iframe'));
});

test('external links get target and rel; relative links stay clean', () => {
  const out = sanitizeBody('<a href="https://x.com">a</a><a href="/contact/">b</a>');
  assert.match(out, /href="https:\/\/x\.com"[^>]*rel="noopener noreferrer"|rel="noopener noreferrer"[^>]*href="https:\/\/x\.com"/);
  assert.ok(out.includes('href="/contact/"'));
});

test('rich formatting is kept: tables, task lists, colors, note boxes', () => {
  const html = '<table><tbody><tr><td colspan="2">x</td></tr></tbody></table><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked></label><div><p>t</p></div></li></ul><span style="color: #acf4f8">c</span><div class="note-box note-box--tip" data-type="callout"><p>n</p></div>';
  const out = sanitizeBody(html);
  for (const k of ['<table', 'colspan="2"', 'data-type="taskList"', 'color:#acf4f8', 'note-box--tip']) assert.ok(out.includes(k), k + ' missing in ' + out);
});

test('headings get ids and the plain-text mirror splits at h2', () => {
  const html = '<p>intro text</p><h2>One</h2><p>a</p><h2>Two</h2><p>b</p>';
  assert.deepEqual(withHeadingIds(html).headings, ['One', 'Two']);
  assert.ok(withHeadingIds(html).html.includes('id="part-2"'));
  assert.deepEqual(bodyToSections(html), [{ h: 'מבוא', t: 'intro text' }, { h: 'One', t: 'a' }, { h: 'Two', t: 'b' }]);
});

test('seo score rewards a complete article and flags a thin one', () => {
  const body = '<h2>אוטומציה לעסקים</h2><p>' + 'מילה '.repeat(320) + '</p><h2>סיכום</h2><p><a href="/contact/">צרו קשר</a></p>';
  const good = seoChecks({ title: 'אוטומציה לעסקים קטנים: מדריך מלא להתחלה', summary: 'מדריך מעשי שמסביר איך מתחילים אוטומציה לעסקים קטנים, צעד אחר צעד, בלי כלים מסובכים.', slug: 'business-automation', focusKeyword: 'אוטומציה לעסקים', bodyHtml: body, bodyText: body.replace(/<[^>]+>/g, ' ') });
  const thin = seoChecks({ title: 'x', summary: '', slug: 'א', bodyHtml: '<p>קצר</p>', bodyText: 'קצר' });
  assert.ok(seoScore(good) >= 85, String(seoScore(good)));
  assert.ok(seoScore(thin) < 40, String(seoScore(thin)));
});
