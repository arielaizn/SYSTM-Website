// Where a validated lead goes. Two optional sinks: the Convex admin inbox and an external webhook. The result is
// "ok" only if at least one configured sink accepted the lead; with none configured the caller must say so
// (503) instead of pretending. Imports use explicit extensions because node:test runs this file directly.
import { api } from '../convex/_generated/api.js';
import { adminKey, convexClient, convexConfigured, withTimeout } from './convex-server.ts';
import type { Lead } from './lead.ts';

export type Delivery = 'ok' | 'not_configured' | 'failed';

async function toConvex(lead: Lead, source: string) {
  await withTimeout(
    convexClient().mutation(api.leads.submit, {
      key: adminKey(),
      lead: { service: lead.service, name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, message: lead.message, source },
    }),
    8000,
  );
}

async function toWebhook(lead: Lead, source: string) {
  const target = process.env.LEAD_WEBHOOK_URL;
  const response = await fetch(target!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.LEAD_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.LEAD_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ ...lead, source: source === 'website' ? 'systm-website' : source, receivedAt: new Date().toISOString() }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('webhook rejected');
}

export async function deliverLead(lead: Lead, source = 'website'): Promise<Delivery> {
  const jobs: Promise<void>[] = [];
  if (convexConfigured() && adminKey().length >= 24) jobs.push(toConvex(lead, source));
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook && hook.startsWith('https://')) jobs.push(toWebhook(lead, source));
  if (jobs.length === 0) return 'not_configured';
  const results = await Promise.allSettled(jobs);
  return results.some((r) => r.status === 'fulfilled') ? 'ok' : 'failed';
}
