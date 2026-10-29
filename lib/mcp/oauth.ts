// OAuth 2.1 building blocks for the hosted MCP server (claude.ai, ChatGPT and any MCP client connect with these).
// Everything is stateless: clients, authorization codes, access tokens and refresh tokens are HMAC-signed tokens, so
// no table is needed. They are all bound to the admin "session version" (lib/admin-session.ts): "sign out everywhere"
// in the admin revokes every MCP token at once. Web Crypto only, so node:test can run this file directly.

export const SCOPE = 'admin';
export const TTL = { code: 60_000, access: 60 * 60_000, refresh: 30 * 24 * 60 * 60_000 } as const;
/** cl = client, ac = authorization code, at = access token, rt = refresh token, pd = pending authorization request (cookie). */
export type TokenType = 'cl' | 'ac' | 'at' | 'rt' | 'pd';

const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), (c) => c.charCodeAt(0));
};

/** A separate key per purpose: the session cookie and these tokens never validate each other. */
async function key(secret: string) {
  const root = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const derived = await crypto.subtle.sign('HMAC', root, enc.encode('systm-mcp-oauth-v1'));
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function signToken(type: TokenType, payload: Record<string, unknown>, secret: string) {
  const body = b64(enc.encode(JSON.stringify(payload)));
  const sig = b64(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(`${type}.${body}`)));
  return `${body}.${sig}`;
}

/** Returns the payload when the signature is valid, the type matches and (if present) `exp` is in the future. */
export async function verifyToken<T extends Record<string, unknown>>(type: TokenType, token: string | undefined | null, secret: string | undefined, now = Date.now()): Promise<T | null> {
  if (!token || !secret || secret.length < 24 || token.length > 4000) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(`${type}.${body}`)));
  if (!equal(sig, expected)) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64(body))) as T;
    if (typeof p.exp === 'number' && p.exp <= now) return null;
    return p;
  } catch {
    return null;
  }
}

/** Redirect URIs a client may register: https, or plain http on loopback (native and desktop clients). No fragments. */
export function validRedirectUri(u: unknown): u is string {
  if (typeof u !== 'string' || u.length > 500) return false;
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');
}

export async function sha256b64url(input: string) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}

/** PKCE S256: the verifier the client sends at the token endpoint must hash to the challenge sent at authorize. */
export async function pkceMatches(verifier: string | null | undefined, challenge: string) {
  if (!verifier || verifier.length < 43 || verifier.length > 128 || !/^[A-Za-z0-9\-._~]+$/.test(verifier)) return false;
  return equal(await sha256b64url(verifier), challenge);
}

export type ClientPayload = { n: string; r: string[]; iat: number };

/** RFC 7591 dynamic client registration. Public clients only (no secret): PKCE protects the code exchange. */
export async function registerClient(body: unknown, secret: string): Promise<{ ok: true; client_id: string; client_name: string; redirect_uris: string[] } | { ok: false; error: string; description: string }> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris : [];
  if (uris.length === 0 || uris.length > 5 || !uris.every(validRedirectUri)) return { ok: false, error: 'invalid_redirect_uri', description: 'redirect_uris must list 1-5 https URLs (or http on localhost).' };
  const name = typeof b.client_name === 'string' ? b.client_name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) : '';
  const client_name = name || 'MCP client';
  const redirect_uris = [...new Set(uris as string[])];
  const client_id = await signToken('cl', { n: client_name, r: redirect_uris, iat: Date.now() } satisfies ClientPayload, secret);
  return { ok: true, client_id, client_name, redirect_uris };
}

export const origin = (request: Request) => {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  if (configured.startsWith('https://')) return configured;
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || url.host;
  return `${proto}://${host}`;
};

export const resourceUrl = (o: string) => `${o}/api/mcp/`;

export function protectedResourceMetadata(o: string) {
  return { resource: resourceUrl(o), authorization_servers: [o], scopes_supported: [SCOPE], bearer_methods_supported: ['header'], resource_name: 'SYSTM admin' };
}

export function authorizationServerMetadata(o: string) {
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize/`,
    token_endpoint: `${o}/oauth/token/`,
    registration_endpoint: `${o}/oauth/register/`,
    scopes_supported: [SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    authorization_response_iss_parameter_supported: true,
  };
}

/** Tiny in-memory sliding-window limiter, per server instance (same trade-off as /api/leads). */
export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (id: string, now = Date.now()) => {
    const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(id, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return recent.length > max;
  };
}

export const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id', 'access-control-expose-headers': 'www-authenticate' } as const;

export const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS, ...extra } });

export const PENDING_COOKIE = 'systm_oauth_pending';
export const PENDING_TTL = 10 * 60_000;

export type PendingRequest = { cid: string; ru: string; cc: string; st: string; iat: number; exp: number };

/** Validates an /authorize request. Anything wrong is reported on an HTML page, never by redirecting to an unverified URI. */
export async function parseAuthorizeRequest(params: URLSearchParams, o: string, secret: string): Promise<{ ok: true; client: ClientPayload; pending: Omit<PendingRequest, 'iat' | 'exp'> } | { ok: false; message: string }> {
  const client = await verifyToken<ClientPayload>('cl', params.get('client_id'), secret);
  if (!client) return { ok: false, message: 'האפליקציה לא מזוהה (client_id לא תקין). נסו לחבר מחדש מתוך האפליקציה.' };
  if (params.get('response_type') !== 'code') return { ok: false, message: 'סוג התגובה לא נתמך. נדרש response_type=code.' };
  let ru = params.get('redirect_uri');
  if (!ru && client.r.length === 1) ru = client.r[0];
  if (!ru || !client.r.includes(ru)) return { ok: false, message: 'כתובת החזרה (redirect_uri) לא תואמת את מה שנרשם.' };
  const cc = params.get('code_challenge') ?? '';
  if (params.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(cc)) return { ok: false, message: 'נדרש PKCE עם code_challenge_method=S256.' };
  const resource = params.get('resource');
  if (resource && resource.replace(/\/$/, '') !== resourceUrl(o).replace(/\/$/, '') && resource.replace(/\/$/, '') !== o) return { ok: false, message: 'הפרמטר resource לא מתאים לשרת הזה.' };
  const st = params.get('state') ?? '';
  if (st.length > 512) return { ok: false, message: 'הפרמטר state ארוך מדי.' };
  return { ok: true, client, pending: { cid: params.get('client_id')!, ru, cc, st } };
}

export function redirectWith(ru: string, params: Record<string, string>) {
  const url = new URL(ru);
  for (const [k, v] of Object.entries(params)) if (v !== '') url.searchParams.set(k, v);
  return url.toString();
}
