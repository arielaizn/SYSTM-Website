import type { CSSProperties } from 'react';

/** Props for the blur reveal (docs/04). `i` staggers siblings by 60ms, capped so nothing waits long. */
export const rv = (i = 0) => ({
  'data-reveal': '',
  style: { '--d': `${Math.min(i, 8) * 60}ms` } as CSSProperties,
});

export const rvWith = (i: number, style: CSSProperties) => ({
  'data-reveal': '',
  style: { ...style, '--d': `${Math.min(i, 8) * 60}ms` } as CSSProperties,
});
