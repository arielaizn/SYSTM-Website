'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Content } from '../../lib/content-source';

const Ctx = createContext<Content | null>(null);

/** Hands the server-resolved content (Convex or built-in) to client components such as the header, search and form. */
export function ContentProvider({ value, children }: { value: Content; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContent(): Content {
  const c = useContext(Ctx);
  if (!c) throw new Error('useContent must be used inside <ContentProvider>');
  return c;
}
