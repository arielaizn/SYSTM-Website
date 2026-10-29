// /api/revalidate only accepts the admin key. The success path calls Next's cache layer, which needs a running
// server, so it is covered by the live check in README. Here: every way of being refused.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { GET, POST } from '../app/api/revalidate/route.ts';

const KEY = 'k'.repeat(40);
const call = (headers: Record<string, string> = {}) => POST(new Request('http://localhost/api/revalidate/', { method: 'POST', headers }));

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.ADMIN_API_KEY;
  process.env.ADMIN_API_KEY = KEY;
});
afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = saved;
});

test('401 without a key', async () => {
  assert.equal((await call()).status, 401);
});

test('401 with a wrong key of the same length', async () => {
  assert.equal((await call({ 'x-admin-key': 'x'.repeat(40) })).status, 401);
});

test('401 with a wrong key of a different length', async () => {
  assert.equal((await call({ 'x-admin-key': KEY.slice(1) })).status, 401);
});

test('401 for every key when the server key is missing or short', async () => {
  delete process.env.ADMIN_API_KEY;
  assert.equal((await call({ 'x-admin-key': '' })).status, 401);
  process.env.ADMIN_API_KEY = 'short';
  assert.equal((await call({ 'x-admin-key': 'short' })).status, 401);
});

test('the answer never contains the key and is not cacheable', async () => {
  const res = await call({ 'x-admin-key': 'x'.repeat(40) });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok(!(await res.text()).includes(KEY));
});

test('GET is not allowed', async () => {
  assert.equal(GET().status, 405);
});
