import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

/** The brand's ↖ arrow: the forward direction in a right-to-left page. */
export const ArrowUpLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M17 17 7 7M7 15V7h8" />
  </svg>
);
export const Plus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const Pause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M9 6v12M15 6v12" />
  </svg>
);
export const Play = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m8 5 11 7-11 7z" />
  </svg>
);
export const WhatsApp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19z" />
    <path d="M9.5 8.7c.3 2.6 2.6 4.8 5.3 5.4l1-1.2-1.9-1-.8.7a4 4 0 0 1-1.9-1.9l.7-.8-1-1.9z" />
  </svg>
);
export const Phone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" />
  </svg>
);
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
