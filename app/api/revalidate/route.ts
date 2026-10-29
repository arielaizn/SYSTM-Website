// Purges the cached site content after an edit made outside the admin UI (the Claude Code / Codex plugin).
// Requires the admin key in the x-admin-key header. Constant-time comparison, no body, no content in the answer.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_API_KEY ?? '';
  const given = request.headers.get('x-admin-key') ?? '';
  if (expected.length < 24 || !equal(given, expected)) return json(401, { error: 'unauthorized' });
  // Loaded only after the key is accepted, so the refusal paths stay runnable under plain node:test.
  const { revalidateTag } = await import('next/cache');
  revalidateTag('content', { expire: 0 });
  return json(200, { ok: true, at: new Date().toISOString() });
}

export function GET() {
  return json(405, { error: 'method_not_allowed' });
}
