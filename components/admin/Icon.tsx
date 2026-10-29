import type { SVGProps } from 'react';

// One small stroke icon set for the admin. Paths are on a 24px grid.
const P = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L10 21h4l.5-2.7c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  data: 'M12 4c4.4 0 8 1.1 8 2.5S16.4 9 12 9 4 7.9 4 6.5 7.6 4 12 4zM4 6.5v5C4 12.9 7.6 14 12 14s8-1.1 8-2.5v-5M4 11.5v5C4 17.9 7.6 19 12 19s8-1.1 8-2.5v-5',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  trash: 'M5 7h14M10 3h4M7 7l1 13h8l1-13M10 11v6M14 11v6',
  up: 'M6 14l6-6 6 6',
  down: 'M6 10l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  phone: 'M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z',
  whatsapp: 'M4 20l1.2-4.1A8 8 0 1 1 8.2 19zM9.5 8.7c.3 2.6 2.6 4.8 5.3 5.4l1-1.2-1.9-1-.8.7a4 4 0 0 1-1.9-1.9l.7-.8-1-1.9z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  menu: 'M4 7h16M4 12h16M4 17h16',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  refresh: 'M20 11a8 8 0 0 0-14.6-4M4 4v4h4M4 13a8 8 0 0 0 14.6 4M20 20v-4h-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  layout: 'M4 4h16v5H4zM4 12h7v8H4zM14 12h6v8h-6z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  key: 'M14 10a4 4 0 1 0-3.7 4L12 16h2v2h2v2h3v-3l-7.5-7.5',
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={P[name]} />
    </svg>
  );
}
