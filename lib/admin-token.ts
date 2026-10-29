// Signed admin session cookie: base64url(payload) + "." + base64url(HMAC-SHA256). Web Crypto only, so the same
// code verifies in proxy.ts and on the server. The payload carries an expiry and the "session version", which
// the admin can bump to sign out every device at once (checked against Convex in lib/admin-session.ts).
export const COOKIE = 'systm_admin';
export const SESSION_MS = 12 * 60 * 60 * 1000;

export type SessionPayload = { v: number; iat: number; exp: number };

const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(secret: string, data: string) {
  return b64(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(data)));
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function signSession(payload: SessionPayload, secret: string) {
  const body = b64(enc.encode(JSON.stringify(payload)));
  return `${body}.${await sign(secret, body)}`;
}

export async function verifySession(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<SessionPayload | null> {
  if (!token || !secret || secret.length < 24) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || token.split('.').length !== 2) return null;
  if (!equal(sig, await sign(secret, body))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64(body))) as SessionPayload;
    if (typeof p.exp !== 'number' || typeof p.v !== 'number' || p.exp <= now) return null;
    return p;
  } catch {
    return null;
  }
}
