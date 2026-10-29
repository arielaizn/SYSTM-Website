// /api/leads contract. Delivery is faked with a stub fetch: nothing leaves the machine.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { GET, POST } from '../app/api/leads/route.ts';

const ORIGIN = 'https://systm.example';
const lead = { service: 'consulting', name: 'דנה כהן', phone: '0534122548', email: '', company: '', message: 'בדיקה', consent: true, website: '' };

const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];
let n = 0;

const req = (body: unknown, over: { origin?: string | null; type?: string; ip?: string; raw?: string } = {}) => {
  const headers: Record<string, string> = { 'x-forwarded-for': over.ip ?? `10.0.0.${++n}` };
  if (over.origin !== null) headers.origin = over.origin ?? ORIGIN;
  headers['content-type'] = over.type ?? 'application/json';
  return new Request(`${ORIGIN}/api/leads/`, { method: 'POST', headers, body: over.raw ?? JSON.stringify(body) });
};

beforeEach(() => {
  process.env.ALLOWED_ORIGIN = ORIGIN;
  process.env.LEAD_WEBHOOK_URL = 'https://hooks.example/lead';
  process.env.LEAD_WEBHOOK_TOKEN = 'test-token';
  delete process.env.CONVEX_URL;
  delete process.env.NEXT_PUBLIC_CONVEX_URL;
  delete process.env.ADMIN_API_KEY;
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('ok', { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('success only after the provider answers 2xx, with bearer token and no spam fields', async () => {
  const res = await POST(req(lead));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hooks.example/lead');
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Bearer test-token');
  const sent = JSON.parse(calls[0].init.body as string);
  assert.equal(sent.source, 'systm-website');
  assert.equal(sent.name, 'דנה כהן');
});

test('403 for a wrong or missing origin, and no delivery', async () => {
  assert.equal((await POST(req(lead, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await POST(req(lead, { origin: null }))).status, 403);
  assert.equal(calls.length, 0);
});

test('403 when ALLOWED_ORIGIN is not configured at all', async () => {
  delete process.env.ALLOWED_ORIGIN;
  assert.equal((await POST(req(lead))).status, 403);
});

test('415 for non-JSON, 400 for broken JSON', async () => {
  assert.equal((await POST(req(lead, { type: 'text/plain' }))).status, 415);
  assert.equal((await POST(req(null, { raw: '{nope' }))).status, 400);
});

test('413 for a body over 16KB', async () => {
  assert.equal((await POST(req({ ...lead, message: 'א'.repeat(20000) }))).status, 413);
});

test('422 without consent, with a filled honeypot, or with an invalid field', async () => {
  assert.equal((await POST(req({ ...lead, consent: false }))).status, 422);
  assert.equal((await POST(req({ ...lead, website: 'x' }))).status, 422);
  assert.equal((await POST(req({ ...lead, phone: '1' }))).status, 422);
  assert.equal(calls.length, 0);
});

test('503 when no provider is configured: never a false success', async () => {
  delete process.env.LEAD_WEBHOOK_URL;
  const res = await POST(req(lead));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test('503 for a non-https provider URL', async () => {
  process.env.LEAD_WEBHOOK_URL = 'http://insecure.example/hook';
  assert.equal((await POST(req(lead))).status, 503);
});

test('502 when the provider rejects or the network fails', async () => {
  globalThis.fetch = (async () => new Response('no', { status: 500 })) as typeof fetch;
  assert.equal((await POST(req(lead))).status, 502);
  globalThis.fetch = (async () => {
    throw new Error('down');
  }) as typeof fetch;
  assert.equal((await POST(req(lead))).status, 502);
});

test('429 after five requests from one address', async () => {
  const ip = '203.0.113.9';
  for (let i = 0; i < 5; i++) assert.equal((await POST(req(lead, { ip }))).status, 200);
  assert.equal((await POST(req(lead, { ip }))).status, 429);
});

test('GET is not allowed', async () => {
  assert.equal(GET().status, 405);
});

// --- Convex inbox sink --------------------------------------------------------------------------
const KEY = 'k'.repeat(32);
const convexFetch = (ok: boolean) =>
  (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('convex')) {
      return new Response(JSON.stringify(ok ? { status: 'success', value: 'lead123', logLines: [] } : { status: 'error', errorMessage: 'boom', logLines: [] }), { status: ok ? 200 : 400, headers: { 'content-type': 'application/json' } });
    }
    return new Response('ok', { status: 200 });
  }) as typeof fetch;

test('Convex sink: stores the lead with the admin key and reports success', async () => {
  process.env.CONVEX_URL = 'https://fake-deploy.convex.cloud';
  process.env.ADMIN_API_KEY = KEY;
  delete process.env.LEAD_WEBHOOK_URL;
  globalThis.fetch = convexFetch(true);
  const res = await POST(req(lead));
  assert.equal(res.status, 200);
  const call = calls.find((c) => c.url.includes('mutation'));
  assert.ok(call, 'a Convex mutation was called');
  const sent = JSON.parse(call!.init.body as string);
  assert.equal(sent.path, 'leads:submit');
  assert.match(JSON.stringify(sent.args), new RegExp(KEY));
  assert.match(JSON.stringify(sent.args), /website/);
});

test('Convex sink down but webhook ok: the lead was delivered, so success', async () => {
  process.env.CONVEX_URL = 'https://fake-deploy.convex.cloud';
  process.env.ADMIN_API_KEY = KEY;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('convex')) throw new Error('down');
    return new Response('ok', { status: 200 });
  }) as typeof fetch;
  assert.equal((await POST(req(lead))).status, 200);
});

test('every configured sink failing is a 502, never a false success', async () => {
  process.env.CONVEX_URL = 'https://fake-deploy.convex.cloud';
  process.env.ADMIN_API_KEY = KEY;
  globalThis.fetch = (async () => {
    throw new Error('down');
  }) as typeof fetch;
  assert.equal((await POST(req(lead))).status, 502);
});

test('a short admin key is ignored, so with no webhook the answer is 503', async () => {
  process.env.CONVEX_URL = 'https://fake-deploy.convex.cloud';
  process.env.ADMIN_API_KEY = 'short';
  delete process.env.LEAD_WEBHOOK_URL;
  assert.equal((await POST(req(lead))).status, 503);
});
