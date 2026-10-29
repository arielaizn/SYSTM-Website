// Web app manifest for the admin: installs /admin as a standalone app on phones and desktops.
export function GET() {
  const manifest = {
    name: 'SYSTM ניהול',
    short_name: 'SYSTM',
    description: 'ניהול הלידים והתוכן של האתר',
    lang: 'he',
    dir: 'rtl',
    id: '/admin/',
    start_url: '/admin/',
    scope: '/admin/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a1013',
    theme_color: '#0a1013',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'לידים חדשים', short_name: 'לידים', url: '/admin/leads/?status=new', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'סקירה', short_name: 'סקירה', url: '/admin/', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
