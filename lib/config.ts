export const site = {
  brand: 'SYSTM',
  founder: 'אריאל יהודה איזנשטט',
  founderShort: 'אריאל איזנשטט',
  // 053-4122548 was supplied in the brief. Confirm it is the business number before launch (docs/11).
  whatsapp: '972534122548',
  phone: '+972534122548',
  phoneDisplay: '053-412-2548',
  email: '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, ''),
  contactMode: (process.env.NEXT_PUBLIC_CONTACT_MODE === 'webhook' ? 'webhook' : 'whatsapp') as 'whatsapp' | 'webhook',
  description: 'סוכני AI, אוטומציות והדרכות מעשיות לעסקים. מתכננים, מחברים ומטמיעים מערכות שמתאימות לעבודה שלכם.',
  socials: [] as { label: string; href: string }[],
  motion: { blur: 8, duration: 800, threshold: 0.3, repeat: true },
} as const;

export const absoluteUrl = (route: string) => (site.siteUrl ? new URL(route, site.siteUrl + '/').href : '');
export const waLinkFor = (number: string, text?: string) => `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const waLink = (text?: string) => waLinkFor(site.whatsapp, text);
