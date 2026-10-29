import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizationServerMetadata, limiter, parseAuthorizeRequest, pkceMatches, protectedResourceMetadata, redirectWith, registerClient, sha256b64url, signToken, validRedirectUri, verifyToken } from '../lib/mcp/oauth.ts';

const SECRET = 's'.repeat(40);
const O = 'https://getsystm.com';

test('signed tokens verify, and tampering, wrong type, wrong secret and expiry are all rejected', async () => {
  const t = await signToken('at', { cid: 'x', exp: Date.now() + 1000 }, SECRET);
  assert.ok(await verifyToken('at', t, SECRET));
  assert.equal(await verifyToken('rt', t, SECRET), null, 'an access token must not pass as a refresh token');
  assert.equal(await verifyToken('at', t, 'o'.repeat(40)), null);
  const [body, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ cid: 'x', exp: Date.now() + 9e9 })).toString('base64url');
  assert.equal(await verifyToken('at', `${forged}.${sig}`, SECRET), null);
  assert.equal(await verifyToken('at', `${body}.${sig}x`, SECRET), null);
  assert.equal(await verifyToken('at', await signToken('at', { exp: Date.now() - 1 }, SECRET), SECRET), null);
  assert.equal(await verifyToken('at', t, 'short'), null);
  assert.equal(await verifyToken('at', undefined, SECRET), null);
  assert.equal(await verifyToken('at', 'a'.repeat(5000), SECRET), null);
});

test('PKCE S256: only the matching verifier passes', async () => {
  const verifier = 'v'.repeat(60);
  const challenge = await sha256b64url(verifier);
  assert.equal(await pkceMatches(verifier, challenge), true);
  assert.equal(await pkceMatches('w'.repeat(60), challenge), false);
  assert.equal(await pkceMatches('short', challenge), false);
  assert.equal(await pkceMatches('bad chars!'.repeat(6), challenge), false);
  assert.equal(await pkceMatches(null, challenge), false);
  // RFC 7636 appendix B test vector
  assert.equal(await sha256b64url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('redirect URIs: https and loopback http only', () => {
  for (const ok of ['https://claude.ai/api/mcp/auth_callback', 'https://chatgpt.com/connector_platform_oauth_redirect', 'http://localhost:6274/oauth/callback', 'http://127.0.0.1:33418/cb']) assert.equal(validRedirectUri(ok), true, ok);
  for (const bad of ['http://evil.com/cb', 'javascript:alert(1)', 'data:text/html,x', 'myapp://cb', 'https://a.com/cb#frag', '', 'not a url', 'ftp://x.com', 'https://' + 'a'.repeat(600)]) assert.equal(validRedirectUri(bad), false, bad);
});

test('client registration validates redirect URIs and cleans the name', async () => {
  assert.equal((await registerClient({ client_name: 'x' }, SECRET)).ok, false);
  assert.equal((await registerClient({ redirect_uris: ['http://evil.com/cb'] }, SECRET)).ok, false);
  assert.equal((await registerClient({ redirect_uris: Array.from({ length: 6 }, (_, i) => `https://a.com/${i}`) }, SECRET)).ok, false);
  const r = await registerClient({ client_name: '<b>Claude</b>\n', redirect_uris: ['https://claude.ai/cb', 'https://claude.ai/cb'] }, SECRET);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.client_name, 'bClaude/b');
    assert.deepEqual(r.redirect_uris, ['https://claude.ai/cb']);
    assert.ok(await verifyToken('cl', r.client_id, SECRET));
  }
});

test('authorize requests: PKCE required, redirect_uri must be registered, bad ones never redirect', async () => {
  const reg = await registerClient({ client_name: 'Claude', redirect_uris: ['https://claude.ai/cb'] }, SECRET);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const challenge = await sha256b64url('v'.repeat(60));
  const base = { client_id: reg.client_id, response_type: 'code', redirect_uri: 'https://claude.ai/cb', code_challenge: challenge, code_challenge_method: 'S256', state: 'abc' };
  const parse = (o: Record<string, string>) => parseAuthorizeRequest(new URLSearchParams(o), O, SECRET);
  const good = await parse(base);
  assert.ok(good.ok);
  assert.equal((await parse({ ...base, redirect_uri: 'https://evil.com/cb' })).ok, false);
  assert.equal((await parse({ ...base, code_challenge_method: 'plain' })).ok, false);
  assert.equal((await parse({ ...base, code_challenge: '' })).ok, false);
  assert.equal((await parse({ ...base, response_type: 'token' })).ok, false);
  assert.equal((await parse({ ...base, client_id: 'forged' })).ok, false);
  assert.equal((await parse({ ...base, resource: 'https://other.example/api/mcp/' })).ok, false);
  assert.equal((await parse({ ...base, resource: `${O}/api/mcp/` })).ok, true);
  assert.equal((await parse({ ...base, state: 'x'.repeat(600) })).ok, false);
  const { redirect_uri: _omit, ...noUri } = base;
  assert.equal((await parse(noUri)).ok, true, 'a single registered URI may be omitted');
});

test('redirectWith keeps existing query parameters and skips empty values', () => {
  assert.equal(redirectWith('https://a.com/cb?x=1', { code: 'c', state: '' }), 'https://a.com/cb?x=1&code=c');
});

test('metadata points at the right endpoints and advertises S256 + public clients', () => {
  const as = authorizationServerMetadata(O);
  assert.equal(as.issuer, O);
  assert.equal(as.authorization_endpoint, `${O}/oauth/authorize/`);
  assert.equal(as.registration_endpoint, `${O}/oauth/register/`);
  assert.equal(as.token_endpoint, `${O}/oauth/token/`);
  assert.deepEqual(as.code_challenge_methods_supported, ['S256']);
  assert.deepEqual(as.token_endpoint_auth_methods_supported, ['none']);
  assert.equal(protectedResourceMetadata(O).resource, `${O}/api/mcp/`);
});

test('limiter blocks after the maximum inside the window and recovers after it', () => {
  const l = limiter(3, 1000);
  assert.deepEqual([1, 2, 3, 4].map(() => l('ip', 10_000)), [false, false, false, true]);
  assert.equal(l('ip', 12_500), false);
  assert.equal(l('other', 10_000), false);
});
