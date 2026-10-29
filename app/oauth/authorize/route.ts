// OAuth authorization endpoint. It validates the request, parks it in a signed cookie, and hands the browser to the
// admin consent page (/admin/oauth/consent). The hand-off is an HTML page, not a 302: the admin session cookie is
// SameSite=Strict, and a redirect chain that began on another site (claude.ai, chatgpt.com) would hide it, so the
// signed-in admin would be asked for the password every time. A navigation started by our own page is same-site.
import { origin, parseAuthorizeRequest, PENDING_COOKIE, PENDING_TTL, signToken } from '../../../lib/mcp/oauth';

export const dynamic = 'force-dynamic';

const page = (status: number, body: string, headers: Record<string, string> = {}) =>
  new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>חיבור אפליקציה | SYSTM</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#080c0e;color:#f5f7f7;font:16px/1.6 system-ui,sans-serif}main{max-width:460px;padding:32px;border-radius:24px;background:#10181c;box-shadow:0 0 0 1px rgba(172,244,248,.35),0 0 40px -10px rgba(172,244,248,.4)}h1{font-size:20px;margin:0 0 10px}a{color:#acf4f8}</style></head><body><main>${body}</main></body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer', ...headers },
  });

export async function GET(request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  if (secret.length < 24) return page(503, '<h1>החיבור לא זמין</h1><p>ממשק הניהול עוד לא הוגדר באתר הזה.</p>');
  const r = await parseAuthorizeRequest(new URL(request.url).searchParams, origin(request), secret);
  if (!r.ok) return page(400, `<h1>אי אפשר לחבר את האפליקציה</h1><p>${r.message}</p>`);
  const now = Date.now();
  const token = await signToken('pd', { ...r.pending, iat: now, exp: now + PENDING_TTL }, secret);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${PENDING_COOKIE}=${token}; Path=/admin; Max-Age=${PENDING_TTL / 1000}; HttpOnly; SameSite=Lax${secure}`;
  const to = '/admin/oauth/consent/';
  return page(200, `<h1>רגע אחד…</h1><p>מעבירים אותך לאישור החיבור. אם לא קרה כלום, <a href="${to}">לחצו כאן</a>.</p><script>location.replace(${JSON.stringify(to)})</script><noscript><meta http-equiv="refresh" content="0;url=${to}"></noscript>`, { 'set-cookie': cookie });
}
