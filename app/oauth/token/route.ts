// OAuth token endpoint: authorization_code (PKCE S256 required) and refresh_token. Tokens are signed, not stored.
import { CORS, json, limiter, origin, pkceMatches, resourceUrl, SCOPE, signToken, TTL, verifyToken, type ClientPayload } from '../../../lib/mcp/oauth';
import { currentSessionVersion } from '../../../lib/mcp/session-version';

const tooMany = limiter(60, 10 * 60_000);
// An authorization code works once. Per server instance: a code is also bound to PKCE and lives 60 seconds.
const usedCodes = new Map<string, number>();

const err = (status: number, error: string, description: string) => json(status, { error, error_description: description });

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  if (secret.length < 24) return err(503, 'server_error', 'not configured');
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (tooMany(ip)) return err(429, 'slow_down', 'too many requests');

  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  let p: Record<string, string> = {};
  try {
    const raw = await request.text();
    if (raw.length > 8192) return err(413, 'invalid_request', 'too large');
    p = ct.includes('application/json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return err(400, 'invalid_request', 'unreadable body');
  }

  const client = await verifyToken<ClientPayload>('cl', p.client_id, secret);
  if (!client) return err(401, 'invalid_client', 'unknown client_id');
  const o = origin(request);
  const version = await currentSessionVersion();
  const now = Date.now();

  const issue = async () => {
    const base = { cid: p.client_id, v: version, iat: now, aud: resourceUrl(o), scope: SCOPE };
    return json(200, {
      access_token: await signToken('at', { ...base, exp: now + TTL.access }, secret),
      token_type: 'Bearer',
      expires_in: TTL.access / 1000,
      refresh_token: await signToken('rt', { ...base, exp: now + TTL.refresh }, secret),
      scope: SCOPE,
    });
  };

  if (p.grant_type === 'authorization_code') {
    const code = await verifyToken<{ cid: string; ru: string; cc: string; v: number; jti: string; exp: number }>('ac', p.code, secret);
    if (!code || code.cid !== p.client_id) return err(400, 'invalid_grant', 'invalid or expired code');
    if (code.ru !== p.redirect_uri) return err(400, 'invalid_grant', 'redirect_uri does not match');
    if (!(await pkceMatches(p.code_verifier, code.cc))) return err(400, 'invalid_grant', 'PKCE verification failed');
    if (code.v !== version) return err(400, 'invalid_grant', 'session was revoked');
    if (usedCodes.has(code.jti)) return err(400, 'invalid_grant', 'code already used');
    usedCodes.set(code.jti, code.exp);
    for (const [k, exp] of usedCodes) if (exp < now) usedCodes.delete(k);
    return issue();
  }

  if (p.grant_type === 'refresh_token') {
    const rt = await verifyToken<{ cid: string; v: number }>('rt', p.refresh_token, secret);
    if (!rt || rt.cid !== p.client_id) return err(400, 'invalid_grant', 'invalid or expired refresh token');
    if (rt.v !== version) return err(400, 'invalid_grant', 'session was revoked');
    return issue();
  }

  return err(400, 'unsupported_grant_type', 'use authorization_code or refresh_token');
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
