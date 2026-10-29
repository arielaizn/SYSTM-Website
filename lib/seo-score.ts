/** On-page SEO checks for a guide, run live in the admin editor. Pure and dependency-free so tests can import it. */
export type SeoInput = { title: string; summary: string; slug: string; seoTitle?: string; seoDescription?: string; focusKeyword?: string; bodyHtml: string; bodyText: string };
export type SeoCheck = { id: string; ok: boolean; label: string; tip: string; weight: number };

const has = (hay: string, needle: string) => needle.trim() !== '' && hay.toLowerCase().includes(needle.trim().toLowerCase());

export function seoChecks(i: SeoInput): SeoCheck[] {
  const kw = (i.focusKeyword ?? '').trim();
  const title = (i.seoTitle || i.title).trim();
  const desc = (i.seoDescription || i.summary).trim();
  const words = i.bodyText.split(/\s+/).filter(Boolean);
  const first = words.slice(0, 120).join(' ');
  const h2 = [...i.bodyHtml.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const imgs = [...i.bodyHtml.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const internal = /<a\b[^>]*href="\/(?!\/)/.test(i.bodyHtml);
  const external = /<a\b[^>]*href="https:\/\//.test(i.bodyHtml);
  const c: SeoCheck[] = [
    { id: 'kw', ok: kw.length > 1, label: 'הוגדרה מילת מפתח ראשית', tip: 'בחרו ביטוי אחד שאנשים מחפשים בגוגל.', weight: 10 },
    { id: 'title-len', ok: title.length >= 30 && title.length <= 60, label: `אורך הכותרת בגוגל (${title.length}) בין 30 ל־60`, tip: 'כותרת ארוכה נחתכת בתוצאות החיפוש.', weight: 10 },
    { id: 'desc-len', ok: desc.length >= 70 && desc.length <= 160, label: `אורך התיאור (${desc.length}) בין 70 ל־160`, tip: 'זה הטקסט שמופיע מתחת לכותרת בגוגל.', weight: 10 },
    { id: 'kw-title', ok: !!kw && has(title, kw), label: 'מילת המפתח מופיעה בכותרת', tip: 'עדיף בתחילת הכותרת.', weight: 12 },
    { id: 'kw-desc', ok: !!kw && has(desc, kw), label: 'מילת המפתח מופיעה בתיאור', tip: 'גוגל מדגיש אותה למי שחיפש אותה.', weight: 6 },
    { id: 'kw-intro', ok: !!kw && has(first, kw), label: 'מילת המפתח מופיעה בפסקה הראשונה', tip: 'בתוך 120 המילים הראשונות.', weight: 10 },
    { id: 'kw-h2', ok: !!kw && h2.some((h) => has(h, kw)), label: 'מילת המפתח מופיעה בכותרת משנה', tip: 'אחת מכותרות ה־H2 או H3.', weight: 6 },
    { id: 'words', ok: words.length >= 300, label: `אורך התוכן (${words.length} מילים), לפחות 300`, tip: 'מדריך מעמיק מתחרה טוב יותר.', weight: 10 },
    { id: 'h2s', ok: h2.length >= 2, label: 'יש לפחות שתי כותרות משנה', tip: 'מבנה ברור עוזר לגוגל ולקורא.', weight: 6 },
    { id: 'internal', ok: internal, label: 'יש קישור פנימי למדריך או לעמוד באתר', tip: 'קישורים פנימיים מאיצים סריקה ומחלקים סמכות.', weight: 8 },
    { id: 'external', ok: external, label: 'יש קישור למקור חיצוני', tip: 'מקור אמין מחזק אמינות.', weight: 3 },
    { id: 'alt', ok: imgs.every((t) => /alt="[^"]+"/.test(t)), label: 'לכל התמונות יש טקסט חלופי', tip: 'נגישות ו־SEO של תמונות.', weight: 4 },
    { id: 'slug', ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug) && i.slug.length <= 60 && !!i.slug, label: 'כתובת קצרה, באנגלית עם מקפים', tip: 'בלי מילים מיותרות.', weight: 5 },
  ];
  return c;
}

export function seoScore(checks: SeoCheck[]): number {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  return Math.round((checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0) / total) * 100);
}

export type LandingSeoInput = { title: string; slug: string; seoTitle?: string; seoDescription?: string; text: string; blocks: { type: string; props: Record<string, unknown> }[] };

/** Checks for a landing page: structure and snippet quality (no keyword checks: landing pages are usually built around an offer, not a query). */
export function landingChecks(i: LandingSeoInput): SeoCheck[] {
  const title = (i.seoTitle || i.title).trim();
  const desc = (i.seoDescription ?? '').trim();
  const words = i.text.split(/\s+/).filter(Boolean).length;
  const hero = i.blocks.find((b) => b.type === 'hero');
  const imgs = i.blocks.filter((b) => b.type === 'image' && b.props.src);
  return [
    { id: 'h1', ok: !!hero && String(hero.props.title ?? '').trim().length > 5, label: 'יש כותרת ראשית (H1) בבלוק Hero', tip: 'לכל דף צריכה להיות כותרת ראשית אחת וברורה.', weight: 18 },
    { id: 'title-len', ok: title.length >= 30 && title.length <= 60, label: `אורך הכותרת בגוגל (${title.length}) בין 30 ל־60`, tip: 'כותרת ארוכה נחתכת בתוצאות החיפוש.', weight: 14 },
    { id: 'desc', ok: desc.length >= 70 && desc.length <= 160, label: `אורך התיאור (${desc.length}) בין 70 ל־160`, tip: 'בלי תיאור גוגל ממציא אחד לבד.', weight: 14 },
    { id: 'cta', ok: i.blocks.some((b) => b.type === 'form' || b.type === 'cta'), label: 'יש קריאה לפעולה או טופס', tip: 'דף בלי פעולה לא מביא לידים.', weight: 16 },
    { id: 'form', ok: i.blocks.some((b) => b.type === 'form'), label: 'יש טופס לידים', tip: 'הוסיפו בלוק "טופס לידים".', weight: 10 },
    { id: 'words', ok: words >= 150, label: `יש מספיק טקסט (${words} מילים), לפחות 150`, tip: 'דף דל בטקסט קשה לגוגל להבין.', weight: 12 },
    { id: 'alt', ok: imgs.every((b) => String(b.props.alt ?? '').trim()), label: 'לכל התמונות יש טקסט חלופי', tip: 'נגישות ו־SEO של תמונות.', weight: 6 },
    { id: 'slug', ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug) && i.slug.length <= 60, label: 'כתובת קצרה, באנגלית עם מקפים', tip: 'למשל ai-agents-webinar.', weight: 10 },
  ];
}
