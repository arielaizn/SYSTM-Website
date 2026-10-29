import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { site } from '../lib/config';
import { getContent } from '../lib/content-source';
import { BOOT_SCRIPT } from '../lib/boot';
import './globals.css';

const heebo = localFont({
  src: [
    { path: './fonts/Heebo-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Heebo-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Heebo-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Heebo-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-heebo',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#080C0E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

const indexable = Boolean(site.siteUrl);

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    metadataBase: new URL(site.siteUrl || 'http://localhost:3000'),
    title: { default: 'SYSTM | פחות עומס. יותר עסק.', template: '%s | SYSTM' },
    description: settings.description,
    applicationName: 'SYSTM',
    // No domain yet means no canonical URLs, so the site ships noindex until NEXT_PUBLIC_SITE_URL is set (docs/07).
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      siteName: 'SYSTM',
      title: 'SYSTM | פחות עומס. יותר עסק.',
      description: settings.description,
      images: indexable ? [{ url: '/og.png', width: 1200, height: 630, alt: 'SYSTM' }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    manifest: '/manifest.webmanifest',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      {/* Browser extensions (password managers, translators) add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
