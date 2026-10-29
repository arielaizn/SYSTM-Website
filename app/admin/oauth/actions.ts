'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdminAction } from '../../../lib/admin-session';
import { currentSessionVersion } from '../../../lib/mcp/session-version';
import { PENDING_COOKIE, redirectWith, signToken, TTL, verifyToken, type PendingRequest } from '../../../lib/mcp/oauth';

/** The admin pressed "approve" or "deny" on the consent page. Everything is re-checked here: the form is not trusted. */
export async function decideOAuth(formData: FormData) {
  await requireAdminAction();
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const jar = await cookies();
  const pending = await verifyToken<PendingRequest>('pd', jar.get(PENDING_COOKIE)?.value, secret);
  jar.delete({ name: PENDING_COOKIE, path: '/admin' });
  if (!pending) redirect('/admin/oauth/consent?expired=1');
  const iss = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '') || undefined;
  const common = { state: pending.st, ...(iss ? { iss } : {}) };
  if (formData.get('decision') !== 'approve') redirect(redirectWith(pending.ru, { error: 'access_denied', error_description: 'The administrator declined.', ...common }));
  const now = Date.now();
  const code = await signToken('ac', { cid: pending.cid, ru: pending.ru, cc: pending.cc, v: await currentSessionVersion(), jti: crypto.randomUUID(), iat: now, exp: now + TTL.code }, secret);
  redirect(redirectWith(pending.ru, { code, ...common }));
}
