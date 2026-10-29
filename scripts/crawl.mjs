// Crawls a running site (default http://localhost:3000), starting at "/" and following every internal link.
// Fails on: non-200 pages, missing <html lang="he" dir="rtl">, not exactly one <h1>, missing title/description,
// broken internal links and missing local images/fonts. Usage: node scripts/crawl.mjs [baseUrl]
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const seen = new Map();
const queue = ['/'];
const problems = [];
const assets = new Set();

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(base + path, { redirect: 'manual' });
  const html = res.status === 200 ? await res.text() : '';
  seen.set(path, res.status);
  if (res.status !== 200) {
    problems.push(`${path} -> HTTP ${res.status}`);
    continue;
  }
  if (!/<html[^>]*lang="he"[^>]*dir="rtl"/.test(html)) problems.push(`${path}: html must be lang=he dir=rtl`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) problems.push(`${path}: expected one <h1>, found ${h1}`);
  if (!/<title>[^<]{3,}<\/title>/.test(html)) problems.push(`${path}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${path}: missing meta description`);
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const href = m[1];
    if (/\.(ico|png|svg|webp|woff2|xml|txt|webmanifest|css|js)$/.test(href) || href.startsWith('/_next/')) assets.add(href);
    else if (!seen.has(href) && !queue.includes(href)) queue.push(href);
  }
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:png|svg|webp|ico|woff2))"/g)) assets.add(m[1]);
  for (const m of html.matchAll(/\/_next\/image\?url=([^&"]+)/g)) assets.add(decodeURIComponent(m[1]));
}

for (const a of assets) {
  const r = await fetch(base + a);
  if (!r.ok) problems.push(`asset ${a} -> HTTP ${r.status}`);
}

// An unknown route must be a real 404 that still renders the branded page.
const nf = await fetch(base + '/definitely-not-here/');
if (nf.status !== 404) problems.push(`unknown route returned ${nf.status}, expected 404`);

const robots = await (await fetch(base + '/robots.txt')).text();
console.log(`pages: ${[...seen.keys()].length}, assets: ${assets.size}`);
console.log([...seen.entries()].map(([p, s]) => `${s} ${p}`).join('\n'));
console.log(`robots.txt: ${robots.replace(/\n/g, ' | ')}`);
if (problems.length) {
  console.error('\nPROBLEMS:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('\nOK: no crawl problems');
