// Probes a running Convex deployment the way an attacker with only the public URL would.
// Usage: CONVEX_URL=http://127.0.0.1:3210 ADMIN_API_KEY=... node scripts/security-check.mjs
// Every admin function must reject a missing or wrong key. The public query must expose published content only.
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const url = process.env.CONVEX_URL;
const key = process.env.ADMIN_API_KEY;
if (!url || !key) {
  console.error('Set CONVEX_URL and ADMIN_API_KEY');
  process.exit(1);
}
const client = new ConvexHttpClient(url, { skipConvexDeploymentUrlCheck: true, logger: false });
const WRONG = 'x'.repeat(key.length);

const readOnly = [
  ['leads.list', {}],
  ['leads.stats', {}],
  ['services.list', {}],
  ['articles.list', {}],
  ['faqs.list', {}],
  ['settings.get', {}],
  ['system.status', {}],
  ['system.auditList', {}],
  ['system.exportAll', {}],
  ['system.sessionVersion', {}],
  ['push.list', {}],
];
const writes = [
  ['leads.submit', { lead: { service: 'x', name: 'Mallory', phone: '0501234567', email: '', company: '', message: '', source: 'attack' } }],
  ['leads.remove', { id: 'k17abc' }],
  ['system.bumpSession', {}],
  ['system.logEvent', { action: 'x', summary: 'x' }],
  ['system.importContent', { services: [], articles: [], faqs: [] }],
  ['faqs.upsert', { data: { q: 'q', a: 'a', published: true } }],
  ['push.subscribe', { endpoint: 'https://attacker.example/push', p256dh: 'x', auth: 'x', label: 'x' }],
  ['push.unsubscribe', { endpoint: 'https://attacker.example/push' }],
];

const get = (path) => path.split('.').reduce((o, k) => o[k], anyApi);
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

async function rejected(kind, path, args) {
  try {
    await client[kind](get(path), args);
    return false;
  } catch {
    return true;
  }
}

for (const [path, args] of readOnly) {
  check(`${path}: no key rejected`, await rejected('query', path, args));
  check(`${path}: wrong key rejected`, await rejected('query', path, { key: WRONG, ...args }));
}
for (const [path, args] of writes) {
  check(`${path}: no key rejected`, await rejected('mutation', path, args));
  check(`${path}: wrong key rejected`, await rejected('mutation', path, { key: WRONG, ...args }));
}

const pub = await client.query(anyApi.content.publicContent, {});
const keys = Object.keys(pub);
check('publicContent works without a key', typeof pub === 'object');
check('publicContent returns only content sections (no leads, audit or meta)', keys.every((k) => ['seeded', 'settings', 'services', 'articles', 'faqs'].includes(k)), keys.join(','));
if (pub.seeded) {
  check('publicContent lists only published services', pub.services.every((s) => s.published !== false));
  check('publicContent lists only published articles', pub.articles.every((a) => a.status === 'published'));
}
check('a correct key is accepted (control)', !(await rejected('query', 'system.status', { key })));

console.log(failures ? `\n${failures} FAILED` : '\nAll security checks passed');
process.exit(failures ? 1 : 0);
