import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AdminProviders } from '../../components/admin/ui';
import '../../styles/admin.css';
import '../../styles/admin-mobile.css';

export const metadata: Metadata = {
  title: 'ניהול | SYSTM',
  robots: { index: false, follow: false, nocache: true },
  manifest: '/admin/manifest.webmanifest',
  applicationName: 'SYSTM ניהול',
  appleWebApp: { capable: true, title: 'SYSTM', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { apple: '/icon-192.png' },
};

// viewport-fit=cover lets the app draw under the notch and home indicator (the CSS pads with env(safe-area-*)).
// resizes-content makes Android shrink the layout, not just the visual viewport, when the keyboard opens.
export const viewport: Viewport = {
  themeColor: '#0a1013',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
