// RFC 7591 dynamic client registration: claude.ai, ChatGPT and other MCP clients register themselves here.
import { CORS, json, limiter, registerClient } from '../../../lib/mcp/oauth';

const tooMany = limiter(20, 60 * 60_000);

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  if (secret.length < 24) return json(503, { error: 'server_error', error_description: 'not configured' });
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (tooMany(ip)) return json(429, { error: 'too_many_requests' });
  const text = await request.text();
  if (text.length > 8192) return json(413, { error: 'invalid_client_metadata', error_description: 'too large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'invalid_client_metadata', error_description: 'invalid JSON' });
  }
  const r = await registerClient(body, secret);
  if (!r.ok) return json(400, { error: r.error, error_description: r.description });
  return json(201, { client_id: r.client_id, client_name: r.client_name, redirect_uris: r.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: 'admin' });
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
