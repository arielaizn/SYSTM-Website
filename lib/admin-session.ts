// Server-side session handling for /admin. proxy.ts does the cheap optimistic check (signature + expiry);
// every page and every server action calls requireAdmin* here, which also compares the session version with
// Convex so "sign out everywhere" takes effect immediately.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '../convex/_generated/api';
import { adminQuery } from './admin-api';
import { COOKIE, SESSION_MS, signSession, verifySession, type SessionPayload } from './admin-token';

let cached: { v: number; at: number } | null = null;

async function currentVersion(force = false) {
  if (!force && cached && Date.now() - cached.at < 5000) return cached.v;
  const v = await adminQuery(api.system.sessionVersion, {});
  cached = { v, at: Date.now() };
  return v;
}

export function dropVersionCache() {
  cached = null;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  const payload = await verifySession(token, process.env.ADMIN_SESSION_SECRET);
  if (!payload) return null;
  try {
    return payload.v === (await currentVersion()) ? payload : null;
  } catch {
    return null;
  }
}

/** For pages: redirects to the login form when there is no valid session. */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  return s;
}

/** For server actions: throws, so a forged request can never reach Convex. */
export async function requireAdminAction() {
  const s = await getSession();
  if (!s) throw new Error('unauthorized');
  return s;
}

export async function startSession() {
  const v = await currentVersion(true);
  const now = Date.now();
  const token = await signSession({ v, iat: now, exp: now + SESSION_MS }, process.env.ADMIN_SESSION_SECRET!);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: SESSION_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).set(COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 0 });
}
