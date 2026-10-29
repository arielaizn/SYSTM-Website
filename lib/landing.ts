// Landing-page model shared by the admin builder, its live preview and the public /lp/<slug> route.
// A page is an ordered list of blocks. Everything here is plain data and pure functions (no React, no Convex),
// so node:test can run it and the server can re-validate whatever the browser sends.

export const BLOCK_TYPES = ['hero', 'text', 'features', 'steps', 'stats', 'image', 'video', 'testimonials', 'faq', 'cta', 'form', 'spacer'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type Surface = 'none' | 'glass' | 'ice' | 'dark';
export type BlockStyle = {
  surface: Surface;
  padY: 'sm' | 'md' | 'lg';
  align: 'start' | 'center';
  width: 'narrow' | 'normal' | 'wide';
  hideOn: '' | 'mobile' | 'desktop';
  anchor: string;
};

type Item = { title: string; text: string };
type Qa = { q: string; a: string };
type Quote = { quote: string; name: string; role: string };
type Stat = { value: string; label: string };

export type Props = {
  hero: { eyebrow: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string; secondaryLabel: string; secondaryHref: string; image: string };
  text: { html: string };
  features: { title: string; intro: string; columns: 2 | 3 | 4; items: Item[] };
  steps: { title: string; items: Item[] };
  stats: { items: Stat[] };
  image: { src: string; alt: string; caption: string };
  video: { url: string; caption: string };
  testimonials: { title: string; items: Quote[] };
  faq: { title: string; items: Qa[] };
  cta: { title: string; text: string; label: string; href: string };
  form: { title: string; text: string; button: string; service: string };
  spacer: { height: number };
};

export type Block<T extends BlockType = BlockType> = { id: string; type: T; hidden?: boolean; style: BlockStyle; props: Props[T] };
export type AnyBlock = { [K in BlockType]: Block<K> }[BlockType];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'כותרת ראשית (Hero)',
  text: 'טקסט עשיר',
  features: 'יתרונות / שירותים',
  steps: 'שלבים',
  stats: 'מספרים',
  image: 'תמונה',
  video: 'סרטון יוטיוב',
  testimonials: 'המלצות',
  faq: 'שאלות ותשובות',
  cta: 'קריאה לפעולה',
  form: 'טופס לידים',
  spacer: 'רווח',
};

export const DEFAULT_STYLE: BlockStyle = { surface: 'none', padY: 'md', align: 'start', width: 'normal', hideOn: '', anchor: '' };

export const DEFAULT_PROPS: { [K in BlockType]: Props[K] } = {
  hero: { eyebrow: 'SYSTM', title: 'כותרת שמסבירה מה מקבלים', subtitle: 'משפט אחד שמחדד למי זה מתאים ומה התוצאה.', ctaLabel: 'לשיחה קצרה', ctaHref: '#lead', secondaryLabel: '', secondaryHref: '', image: '' },
  text: { html: '<h2>כותרת</h2><p>כאן כותבים את הטקסט.</p>' },
  features: { title: 'מה מקבלים', intro: '', columns: 3, items: [{ title: 'יתרון ראשון', text: 'הסבר קצר.' }, { title: 'יתרון שני', text: 'הסבר קצר.' }, { title: 'יתרון שלישי', text: 'הסבר קצר.' }] },
  steps: { title: 'איך זה עובד', items: [{ title: 'שיחת היכרות', text: 'מבינים את העסק.' }, { title: 'תכנון', text: 'בוחרים תהליך אחד להתחלה.' }, { title: 'הטמעה', text: 'מחברים ובודקים.' }] },
  stats: { items: [{ value: '3', label: 'ימים להטמעה' }, { value: '1', label: 'תהליך להתחלה' }] },
  image: { src: '', alt: '', caption: '' },
  video: { url: '', caption: '' },
  testimonials: { title: 'מה אומרים', items: [{ quote: '', name: '', role: '' }] },
  faq: { title: 'שאלות נפוצות', items: [{ q: 'שאלה?', a: 'תשובה.' }] },
  cta: { title: 'מוכנים להתחיל?', text: 'שיחה קצרה, בלי התחייבות.', label: 'לשיחה קצרה', href: '#lead' },
  form: { title: 'משאירים פרטים', text: 'חוזרים אליכם בהקדם.', button: 'שליחה', service: 'not-sure' },
  spacer: { height: 48 },
};

export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

export function newBlock<T extends BlockType>(type: T, overrides?: Partial<Props[T]>): Block<T> {
  return { id: uid(), type, style: { ...DEFAULT_STYLE, ...(type === 'hero' ? { align: 'center' as const, padY: 'lg' as const } : {}), ...(type === 'cta' ? { surface: 'glass' as const, align: 'center' as const } : {}) }, props: { ...structuredClone(DEFAULT_PROPS[type]), ...overrides } as Props[T] };
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
/** Links on landing pages: site paths, #anchors, https, mailto, tel. Everything else (javascript:, data:) becomes empty. */
export const safeHref = (v: unknown) => {
  const s = str(v, 2000).trim();
  return /^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/.test(s) ? s : '';
};
export const safeImage = (v: unknown) => {
  const s = str(v, 2000).trim();
  return /^(https:\/\/|\/(?!\/))/.test(s) ? s : '';
};
const slugAnchor = (v: unknown) => str(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');

export function youtubeId(url: string): string | null {
  const m = url.trim().match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/);
  return m ? m[1] : null;
}

/** Re-builds every block from untrusted input: unknown types are dropped, strings clamped, links and images restricted. */
export function normalizeBlocks(input: unknown, sanitizeHtml: (html: string) => string = (h) => h): AnyBlock[] {
  const out: AnyBlock[] = [];
  for (const raw of arr(input, 80)) {
    const b = obj(raw);
    const type = b.type as BlockType;
    if (!BLOCK_TYPES.includes(type)) continue;
    const s = obj(b.style);
    const style: BlockStyle = {
      surface: oneOf(s.surface, ['none', 'glass', 'ice', 'dark'] as const, 'none'),
      padY: oneOf(s.padY, ['sm', 'md', 'lg'] as const, 'md'),
      align: oneOf(s.align, ['start', 'center'] as const, 'start'),
      width: oneOf(s.width, ['narrow', 'normal', 'wide'] as const, 'normal'),
      hideOn: oneOf(s.hideOn, ['', 'mobile', 'desktop'] as const, ''),
      anchor: slugAnchor(s.anchor),
    };
    const p = obj(b.props);
    const items = (key: string, n = 24) => arr(p[key], n).map(obj);
    let props: Props[BlockType];
    switch (type) {
      case 'hero':
        props = { eyebrow: str(p.eyebrow, 60), title: str(p.title, 200), subtitle: str(p.subtitle, 500), ctaLabel: str(p.ctaLabel, 60), ctaHref: safeHref(p.ctaHref), secondaryLabel: str(p.secondaryLabel, 60), secondaryHref: safeHref(p.secondaryHref), image: safeImage(p.image) };
        break;
      case 'text':
        props = { html: sanitizeHtml(str(p.html, 100000)) };
        break;
      case 'features':
        props = { title: str(p.title, 200), intro: str(p.intro, 500), columns: [2, 3, 4].includes(Number(p.columns)) ? (Number(p.columns) as 2 | 3 | 4) : 3, items: items('items').map((i) => ({ title: str(i.title, 120), text: str(i.text, 600) })) };
        break;
      case 'steps':
        props = { title: str(p.title, 200), items: items('items', 12).map((i) => ({ title: str(i.title, 120), text: str(i.text, 600) })) };
        break;
      case 'stats':
        props = { items: items('items', 8).map((i) => ({ value: str(i.value, 20), label: str(i.label, 80) })) };
        break;
      case 'image':
        props = { src: safeImage(p.src), alt: str(p.alt, 200), caption: str(p.caption, 200) };
        break;
      case 'video':
        props = { url: youtubeId(str(p.url, 300)) ? str(p.url, 300) : '', caption: str(p.caption, 200) };
        break;
      case 'testimonials':
        props = { title: str(p.title, 200), items: items('items', 12).map((i) => ({ quote: str(i.quote, 800), name: str(i.name, 80), role: str(i.role, 80) })) };
        break;
      case 'faq':
        props = { title: str(p.title, 200), items: items('items', 20).map((i) => ({ q: str(i.q, 300), a: str(i.a, 1500) })) };
        break;
      case 'cta':
        props = { title: str(p.title, 200), text: str(p.text, 500), label: str(p.label, 60), href: safeHref(p.href) };
        break;
      case 'form':
        props = { title: str(p.title, 200), text: str(p.text, 500), button: str(p.button, 40) || 'שליחה', service: str(p.service, 40) || 'not-sure' };
        break;
      case 'spacer':
        props = { height: Math.min(240, Math.max(8, Math.round(Number(p.height) || 48))) };
        break;
    }
    out.push({ id: str(b.id, 20) || uid(), type, hidden: b.hidden === true ? true : undefined, style, props } as AnyBlock);
  }
  return out;
}

export function parseBlocks(json: string, sanitizeHtml?: (html: string) => string): AnyBlock[] {
  try {
    return normalizeBlocks(JSON.parse(json), sanitizeHtml);
  } catch {
    return [];
  }
}

/** Plain text of a page, for the SEO checks and the word count. */
export function pageText(blocks: AnyBlock[]): string {
  const bits: string[] = [];
  for (const b of blocks) {
    if (b.hidden) continue;
    const p = b.props as Record<string, unknown>;
    for (const v of Object.values(p)) {
      if (typeof v === 'string') bits.push(v.replace(/<[^>]+>/g, ' '));
      else if (Array.isArray(v)) for (const it of v) for (const x of Object.values(it as Record<string, unknown>)) if (typeof x === 'string') bits.push(x);
    }
  }
  return bits.join(' ').replace(/\s+/g, ' ').trim();
}

export type Template = { id: string; label: string; description: string; blocks: () => AnyBlock[] };

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'דף ריק',
    description: 'מתחילים מכותרת ראשית וטופס.',
    blocks: () => [newBlock('hero'), newBlock('form')],
  },
  {
    id: 'service',
    label: 'דף שירות',
    description: 'כותרת, יתרונות, שלבים, שאלות וטופס. מתאים לקמפיין על שירות אחד.',
    blocks: () => [
      newBlock('hero', { title: 'סוכן AI שעונה ללקוחות שלכם גם בלילה', subtitle: 'מתכננים, מחברים ומטמיעים. בלי ג׳רגון ובלי מערכת שאף אחד לא משתמש בה.' }),
      newBlock('features'),
      newBlock('steps'),
      newBlock('faq'),
      newBlock('cta'),
      { ...newBlock('form'), id: uid(), style: { ...DEFAULT_STYLE, anchor: 'lead', surface: 'glass', align: 'center', width: 'narrow' } },
    ],
  },
  {
    id: 'webinar',
    label: 'הרשמה לוובינר',
    description: 'הרשמה עם סרטון, מספרים והמלצות.',
    blocks: () => [
      newBlock('hero', { eyebrow: 'וובינר חי', title: 'איך מחברים AI לעסק תוך שעה', subtitle: 'שעה אחת, דוגמאות חיות, ושאלות בסוף.', ctaLabel: 'שריינו מקום', ctaHref: '#lead' }),
      newBlock('video'),
      newBlock('stats'),
      newBlock('text', { html: '<h2>מה נעבור</h2><ul><li>איך בוחרים את התהליך הראשון</li><li>הדגמה חיה של סוכן</li><li>שאלות ותשובות</li></ul>' }),
      newBlock('testimonials'),
      { ...newBlock('form', { title: 'שריינו מקום', button: 'הרשמה' }), style: { ...DEFAULT_STYLE, anchor: 'lead', surface: 'glass', align: 'center', width: 'narrow' } },
    ],
  },
];

/** Starter content for a new page. */
export const startBlocks = (id = 'service') => (TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]).blocks();
