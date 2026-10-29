import type { Content } from './content-source';

export type SearchEntry = { title: string; hint: string; href: string; group: 'פתרונות' | 'מדריכים' | 'עמודים'; keywords: string };

// One flat index for the site search (components/layout/SearchPalette). Built from the same content the pages use.
export const buildSearchIndex = ({ services, articles }: Pick<Content, 'services' | 'articles'>): SearchEntry[] => [
  ...services.map((s) => ({
    title: s.label,
    hint: s.short,
    href: `/services/${s.slug}/`,
    group: 'פתרונות' as const,
    keywords: `${s.title} ${s.intro} ${s.items.join(' ')} ${s.example.join(' ')}`,
  })),
  ...articles.map((a) => ({
    title: a.title,
    hint: a.summary,
    href: `/knowledge/${a.slug}/`,
    group: 'מדריכים' as const,
    keywords: `${a.category} ${a.sections.map((x) => x.join(' ')).join(' ')}`,
  })),
  { title: 'איך עובדים יחד', hint: 'מיפוי, תכנון, חיבור ושיפור', href: '/process/', group: 'עמודים', keywords: 'תהליך שיטה הרשאות בקרה תיעוד פיילוט' },
  { title: 'הרצאות וסדנאות', hint: 'לצוותים, לארגונים וליוצרים', href: '/workshops/', group: 'עמודים', keywords: 'הדרכה סדנה הרצאה צוות קלוד קוד' },
  { title: 'על אריאל איזנשטט', hint: 'יזם, יוצר תוכן ומרצה ל־AI', href: '/about/', group: 'עמודים', keywords: 'אודות PixMind מייסד' },
  { title: 'ידע מעשי', hint: 'כל המדריכים במקום אחד', href: '/knowledge/', group: 'עמודים', keywords: 'מדריכים מאמרים חיפוש' },
  { title: 'יצירת קשר', hint: 'טופס, וואטסאפ וטלפון', href: '/contact/', group: 'עמודים', keywords: 'פנייה שיחה וואטסאפ טלפון בואו נדבר' },
  { title: 'מדיניות פרטיות', hint: 'מה קורה עם הפרטים שלכם', href: '/privacy/', group: 'עמודים', keywords: 'פרטיות מידע טופס' },
  { title: 'נגישות', hint: 'מקלדת, תנועה ומשוב', href: '/accessibility/', group: 'עמודים', keywords: 'נגישות מקלדת תנועה' },
];

export function searchSite(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLocaleLowerCase('he');
  if (!q) return index.slice(0, limit);
  const terms = q.split(/\s+/);
  return index
    .map((e) => {
      const title = e.title.toLocaleLowerCase('he');
      const hay = `${title} ${e.hint} ${e.keywords}`.toLocaleLowerCase('he');
      if (!terms.every((t) => hay.includes(t))) return null;
      const score = terms.reduce((s, t) => s + (title.includes(t) ? 3 : 0) + (e.hint.toLocaleLowerCase('he').includes(t) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x): x is { e: SearchEntry; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}
