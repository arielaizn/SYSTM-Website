// Hosted MCP server (Streamable HTTP, stateless, JSON responses) for claude.ai, ChatGPT and any MCP client.
// Connector URL: https://<your-domain>/api/mcp/  Sign-in: OAuth 2.1 with PKCE (see lib/mcp/oauth.ts), approved by the admin.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ConvexHttpClient } from 'convex/browser';
import { revalidateTag } from 'next/cache';
import { adminKey, convexClient, convexConfigured } from '../../../lib/convex-server';
import { createApi, createHandler } from '../../../lib/mcp/handler.mjs';
import { CORS, json, limiter, origin, resourceUrl, verifyToken } from '../../../lib/mcp/oauth';
import { currentSessionVersion } from '../../../lib/mcp/session-version';
import { buildTools } from '../../../lib/mcp/tools.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VERSION = '1.1.0';
const tooMany = limiter(120, 60_000);
const INSTRUCTIONS =
  'Manage the SYSTM website (Hebrew, RTL): leads, services, guides, FAQs, landing pages, short links, settings and SEO. ' +
  'Read before you write. Edits to public content go live immediately. Deleting needs a first call that shows what goes, then a second call with confirm: true only after the user said yes. ' +
  'New content starts as a draft: publish it with the status tools. Never invent facts, prices or testimonials.';

async function authenticate(request: Request) {
  const o = origin(request);
  const challenge = (error?: string) =>
    json(401, { error: error ?? 'unauthorized', error_description: 'Bearer token required' }, { 'www-authenticate': `Bearer resource_metadata="${o}/.well-known/oauth-protected-resource/api/mcp/"${error ? `, error="${error}"` : ''}` });
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  if (secret.length < 24 || !convexConfigured() || adminKey().length < 24) return { response: json(503, { error: 'server_error', error_description: 'not configured' }) };
  const header = request.headers.get('authorization') ?? '';
  const m = header.match(/^Bearer\s+(\S+)$/i);
  if (!m) return { response: challenge() };
  const t = await verifyToken<{ cid: string; v: number; aud: string }>('at', m[1], secret);
  if (!t || t.aud !== resourceUrl(o)) return { response: challenge('invalid_token') };
  try {
    if (t.v !== (await currentSessionVersion())) return { response: challenge('invalid_token') };
  } catch {
    return { response: json(503, { error: 'server_error', error_description: 'backend unavailable' }) };
  }
  return { cid: t.cid };
}

function withCors(res: Response) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  headers.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function POST(request: Request) {
  if (process.env.SYSTM_MCP_DISABLED === '1') return json(404, { error: 'not_found' });
  const auth = await authenticate(request);
  if ('response' in auth && auth.response) return auth.response;
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (tooMany(`${auth.cid}:${ip}`)) return json(429, { error: 'too_many_requests' }, { 'retry-after': '30' });
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > 1_000_000) return json(413, { error: 'too_large' });

  const readonly = process.env.SYSTM_READONLY === '1';
  const client = convexClient() as ConvexHttpClient;
  const api = createApi(client, adminKey());
  const ctx = {
    cfg: { problems: [], readonly, siteUrl: '', convexUrl: '', adminKey: '' },
    api,
    now: Date.now(),
    fetchImpl: fetch,
    indexNow: async () => {
      const key = process.env.INDEXNOW_KEY ?? '';
      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
      if (!/^[A-Za-z0-9-]{8,128}$/.test(key) || !base.startsWith('https://')) return { ok: false, reason: 'IndexNow לא הוגדר: חסר INDEXNOW_KEY או NEXT_PUBLIC_SITE_URL באתר.' };
      const { default: sitemap } = await import('../../sitemap');
      const urlList = (await sitemap()).map((e) => e.url);
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/api/indexnow`, urlList }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok && res.status !== 202) return { ok: false, reason: `IndexNow ענה ${res.status}` };
      return { ok: true, sent: urlList.length };
    },
    publish: async () => {
      revalidateTag('content', { expire: 0 });
      return { done: true };
    },
  };

  const server = new McpServer({ name: 'systm-admin', version: VERSION }, { instructions: INSTRUCTIONS });
  for (const def of buildTools()) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.input,
        annotations: { readOnlyHint: def.kind === 'read', destructiveHint: def.kind === 'destructive', idempotentHint: def.kind === 'read', openWorldHint: false },
      },
      createHandler(def, () => ({ ...ctx, now: Date.now() })) as never,
    );
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(request));
  } finally {
    // The transport is per request; nothing is kept between calls.
    void server.close().catch(() => {});
  }
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ('response' in auth && auth.response) return auth.response;
  return json(405, { error: 'method_not_allowed', error_description: 'This server answers POST (Streamable HTTP, no server-initiated stream).' }, { allow: 'POST, OPTIONS' });
}

export const DELETE = GET;
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
