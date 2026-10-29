import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COVER_STYLES, coverSpec, hash } from '../lib/cover.ts';
import { renderToc, sanitizeBody, withHeadingIds } from '../lib/sanitize.ts';

test('cover is deterministic per slug, in range, and overridable', () => {
  const a = coverSpec('first-automation');
  assert.deepEqual(a, coverSpec('first-automation'));
  assert.ok(a.style >= 0 && a.style < COVER_STYLES);
  assert.equal(coverSpec('x', { style: 5 }).style, 5);
  assert.equal(coverSpec('x', { style: 99 }).style < COVER_STYLES, true);
  assert.notEqual(coverSpec('x', { seed: 1 }).vars['--cv-rot'], coverSpec('x', { seed: 2 }).vars['--cv-rot']);
});

test('slugs spread over all cover styles', () => {
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) seen.add(coverSpec(`guide-${i}`).style);
  assert.equal(seen.size, COVER_STYLES);
  assert.equal(hash('a'), hash('a'));
});

test('the toc placeholder survives sanitizing and becomes a linked outline of h2 and h3', () => {
  const body = '<div data-type="toc"></div><p>intro</p><h2>אחד</h2><p>a</p><h3>משנה</h3><p>b</p><h2>שניים</h2>';
  const clean = sanitizeBody(body);
  assert.ok(clean.includes('data-type="toc"'), clean);
  const { html, outline } = withHeadingIds(clean);
  assert.deepEqual(outline.map((o) => `${o.level}:${o.id}`), ['2:part-1', '3:sub-1', '2:part-2']);
  const out = renderToc(html, outline);
  assert.ok(!out.includes('data-type="toc"'));
  assert.ok(out.includes('href="#part-1"') && out.includes('href="#sub-1"') && out.includes('class="toc-inline"'));
});

test('toc text is escaped', () => {
  const { html, outline } = withHeadingIds('<div data-type="toc"></div><h2>a &lt;b&gt;</h2>');
  assert.ok(!renderToc(html, [{ ...outline[0], text: '<img src=x onerror=1>' }]).includes('<img'));
});
