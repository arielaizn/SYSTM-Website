// Web Push to the admin's devices when a lead arrives. Best effort: a failure here never affects the visitor.
import webpush from 'web-push';
import { api } from '../convex/_generated/api.js';
import { adminMutation, adminQuery } from './admin-api.ts';
import type { Lead } from './lead.ts';

export const pushConfigured = () => Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export async function notifyAdmins(payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, removed: 0 };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const subs = await adminQuery(api.push.list, {});
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await adminMutation(api.push.unsubscribe, { endpoint: s.endpoint }).catch(() => {});
          removed++;
        }
      }
    }),
  );
  return { sent, removed };
}

export function notifyNewLead(lead: Lead) {
  const where = lead.service && lead.service !== 'not-sure' ? lead.service : 'עדיין לא בטוחים';
  return notifyAdmins({
    title: `ליד חדש: ${lead.name}`,
    body: `${where} · ${lead.phone}`,
    url: '/admin/leads/?status=new',
    tag: 'new-lead',
  });
}
