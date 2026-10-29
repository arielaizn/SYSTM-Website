// Short link redirect: /go/<code> -> target URL, counting the click. Lives outside the (site) shell on purpose: no HTML, no JS.
import { NextResponse } from 'next/server';
import { api } from '../../../convex/_generated/api';
import { adminKey, convexClient, convexConfigured, withTimeout } from '../../../lib/convex-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const home = new URL('/', request.url);
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/i.test(code) || !convexConfigured() || adminKey().length < 24) return NextResponse.redirect(home, 302);
  try {
    const target = await withTimeout(convexClient().mutation(api.links.follow, { key: adminKey(), code }), 6000);
    if (!target) return NextResponse.redirect(home, 302);
    return new NextResponse(null, { status: 302, headers: { location: target, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer-when-downgrade' } });
  } catch {
    return NextResponse.redirect(home, 302);
  }
}
