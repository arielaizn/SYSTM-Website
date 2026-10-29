// Service worker for the admin app. It does three small jobs: an offline fallback page, cache-first for static
// build assets, and Web Push (new-lead notifications that open the lead). It never caches admin pages or data.
const SW = `
const OFFLINE = '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>אין חיבור</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0a1013;color:#f1f5f6;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:26px;margin:0 0 8px}p{color:#9fb0b6;margin:0 0 22px}button{font:inherit;background:#acf4f8;color:#04181a;border:0;border-radius:14px;padding:14px 26px;font-weight:700}</style><div><h1>אין חיבור כרגע</h1><p>הנתונים נטענים מהשרת. נסו שוב כשיש רשת.</p><button onclick="location.reload()">ניסיון נוסף</button></div></html>';
const STATIC = 'systm-admin-static-v1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== STATIC) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (req.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })));
  }
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'SYSTM', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'systm',
      dir: 'rtl',
      lang: 'he',
      data: { url: d.url || '/admin/leads/' },
    });
    if (self.navigator && self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(); } catch (_) {} }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/leads/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('/admin')) { await c.focus(); if ('navigate' in c) await c.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
`;

export function GET() {
  return new Response(SW, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'service-worker-allowed': '/admin/',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
  });
}
