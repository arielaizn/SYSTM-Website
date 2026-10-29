'use client';

import { useEffect, useState } from 'react';
import { SmartLink } from '../ui/SmartLink';
import { useContent } from './ContentContext';

/** Optional site-wide notice, switched on from the admin settings. A visitor can dismiss it for the session. */
export function AnnouncementBar() {
  const { banner } = useContent().settings;
  const key = `systm-banner:${banner.text}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(key) === '1');
    } catch {
      setHidden(false);
    }
  }, [key]);

  if (!banner.enabled || !banner.text || hidden) return null;
  const inner = <span>{banner.text}</span>;
  return (
    <div className="banner" role="region" aria-label="הודעה">
      {banner.href ? (
        banner.href.startsWith('/') ? (
          <SmartLink href={banner.href}>{inner}</SmartLink>
        ) : (
          <a href={banner.href} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        )
      ) : (
        inner
      )}
      <button
        type="button"
        aria-label="סגירת ההודעה"
        onClick={() => {
          try {
            sessionStorage.setItem(key, '1');
          } catch {}
          setHidden(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
