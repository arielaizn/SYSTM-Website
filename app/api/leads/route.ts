// Lead endpoint for contactMode "webhook". It never reports success unless a configured sink (the Convex admin
// inbox or the external webhook) accepted the lead. Rate limiting is in-memory and per instance: add a shared limiter before scaling out.
import { deliverLead } from '../../../lib/lead-sinks.ts';
import { validateLead, type Lead } from '../../../lib/lead.ts';

const MAX_BODY = 16 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  // ALLOWED_ORIGIN is one exact origin, or several separated by commas (the live domain and the *.vercel.app address).
  const allowed = (process.env.ALLOWED_ORIGIN ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  const origin = request.headers.get('origin');
  if (!origin || !allowed.includes(origin)) return json(403, { error: 'origin_not_allowed' });

  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json(415, { error: 'json_only' });
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return json(429, { error: 'too_many_requests' });

  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: 'too_large' });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const result = validateLead(body);
  if (!result.ok) return json(422, { error: 'invalid', fields: Object.keys(result.errors) });

  // Landing pages tag their leads "lp:<slug>". Anything else is the plain website form.
  const rawSource = (body as { source?: unknown }).source;
  const source = typeof rawSource === 'string' && /^lp:[a-z0-9-]{1,60}$/.test(rawSource) ? rawSource.slice(0, 40) : 'website';
  const delivery = await deliverLead(result.data, source);
  if (delivery === 'not_configured') return json(503, { error: 'not_configured' });
  if (delivery === 'failed') return json(502, { error: 'delivery_failed' });
  notifyInBackground(result.data);
  return json(200, { ok: true });
}

// Push to the admin's phone after the response is sent. Loaded lazily so the node tests never touch web-push or next/server.
function notifyInBackground(lead: Lead) {
  if (!process.env.VAPID_PRIVATE_KEY) return;
  const job = async () => {
    try {
      const { notifyNewLead } = await import('../../../lib/push.ts');
      await notifyNewLead(lead);
    } catch {
      // a push failure must never reach the visitor
    }
  };
  import('next/server').then(({ after }) => after(job)).catch(() => void job());
}

export function GET() {
  return json(405, { error: 'method_not_allowed' });
}
