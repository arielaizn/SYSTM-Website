import type { ReactNode } from 'react';
import { getContent } from '../../lib/content-source';
import { Effects } from '../motion/Effects';
import { GlassStage } from '../stage/GlassStage';
import { AnnouncementBar } from './AnnouncementBar';
import { ContentProvider } from './ContentContext';
import { Footer } from './Footer';
import { Header } from './Header';
import { SearchPalette } from './SearchPalette';

/** Everything that frames a public page: glass stage, banner, header, search, footer. The admin does not use it. */
export async function SiteShell({ children }: { children: ReactNode }) {
  const content = await getContent();
  return (
    <ContentProvider value={content}>
      <a className="skip-link" href="#main">
        דלג לתוכן
      </a>
      <GlassStage />
      <AnnouncementBar />
      <Header />
      <SearchPalette />
      {children}
      <Footer />
      <Effects />
      <div className="grain" aria-hidden="true" />
    </ContentProvider>
  );
}
