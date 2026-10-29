import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { checkLogin, recordFailure, recordSuccess, resetRateLimitForTests } from '../lib/admin-rate.ts';
import { hashPassword, verifyPassword } from '../lib/admin-password.ts';
import { signSession, verifySession } from '../lib/admin-token.ts';

const SECRET = 's'.repeat(40);
const now = Date.now();

test('a freshly signed session verifies and keeps its payload', async () => {
  const token = await signSession({ v: 3, iat: now, exp: now + 60_000 }, SECRET);
  const p = await verifySession(token, SECRET, now);
  assert.equal(p?.v, 3);
});

test('tampered payload, tampered signature, wrong secret and malformed tokens are rejected', async () => {
  const token = await signSession({ v: 1, iat: now, exp: now + 60_000 }, SECRET);
  const [body, sig] = token.split('.');
  const forged = btoa(JSON.stringify({ v: 1, iat: now, exp: now + 9e9 })).replace(/=+$/, '');
  assert.equal(await verifySession(`${forged}.${sig}`, SECRET, now), null);
  assert.equal(await verifySession(`${body}.${sig.slice(0, -2)}xx`, SECRET, now), null);
  assert.equal(await verifySession(token, 'x'.repeat(40), now), null);
  for (const bad of [undefined, '', 'abc', 'a.b.c', '.']) assert.equal(await verifySession(bad, SECRET, now), null);
});

test('an expired session is rejected and a short secret is never accepted', async () => {
  const token = await signSession({ v: 1, iat: now - 1000, exp: now - 1 }, SECRET);
  assert.equal(await verifySession(token, SECRET, now), null);
  const short = await signSession({ v: 1, iat: now, exp: now + 1000 }, 'short');
  assert.equal(await verifySession(short, 'short', now), null);
});

test('scrypt hash: right password passes, wrong one fails, malformed hash fails closed', () => {
  const hash = hashPassword('correct horse battery');
  assert.match(hash, /^scrypt\$16384\$/);
  assert.equal(verifyPassword('correct horse battery', { hash }), true);
  assert.equal(verifyPassword('correct horse batterz', { hash }), false);
  assert.equal(verifyPassword('anything', { hash: 'scrypt$bad' }), false);
  assert.equal(verifyPassword('anything', { hash: 'md5$1$2$3' }), false);
});

test('plain password (dev only) compares in constant time, empty input never passes', () => {
  assert.equal(verifyPassword('dev-pass', { plain: 'dev-pass' }), true);
  assert.equal(verifyPassword('dev-pasx', { plain: 'dev-pass' }), false);
  assert.equal(verifyPassword('', { plain: '' }), false);
  assert.equal(verifyPassword('x', {}), false);
});

beforeEach(() => resetRateLimitForTests());

test('five failures lock an address for 15 minutes; others are unaffected; success clears', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) recordFailure('1.1.1.1', t0 + i);
  assert.equal(checkLogin('1.1.1.1', t0 + 10).allowed, true);
  recordFailure('1.1.1.1', t0 + 5);
  const locked = checkLogin('1.1.1.1', t0 + 10);
  assert.equal(locked.allowed, false);
  assert.ok(locked.retryAfterSec > 800 && locked.retryAfterSec <= 900);
  assert.equal(checkLogin('2.2.2.2', t0 + 10).allowed, true);
  assert.equal(checkLogin('1.1.1.1', t0 + 16 * 60_000).allowed, true);
  recordFailure('3.3.3.3', t0);
  recordSuccess('3.3.3.3');
  for (let i = 0; i < 4; i++) recordFailure('3.3.3.3', t0 + i);
  assert.equal(checkLogin('3.3.3.3', t0 + 10).allowed, true);
});

test('a flood of failures from many addresses trips the global lock', () => {
  const t0 = 5_000_000;
  for (let i = 0; i < 40; i++) recordFailure(`9.9.9.${i}`, t0 + i);
  assert.equal(checkLogin('8.8.8.8', t0 + 100).allowed, false);
});
