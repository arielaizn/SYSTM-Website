// IndexNow ownership file: search engines fetch this URL (keyLocation) and expect the key as the whole body.
export function GET() {
  const key = process.env.INDEXNOW_KEY ?? '';
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return new Response('not found', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
