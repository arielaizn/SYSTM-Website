// Pure HTML helpers for guide bodies (no dependencies), safe to import from client components.
// Sanitizing itself lives in lib/sanitize.ts because it pulls in a heavy server-side library.

export type OutlineItem = { level: 2 | 3; text: string; id: string };

const plainHeading = (inner: string) => inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

/**
 * Adds ids to <h2> (part-N) and <h3> (sub-N) so the table of contents can link to them, and returns the outline.
 * `headings` keeps the h2 titles only: the sidebar list and older callers use it.
 */
export function withHeadingIds(html: string): { html: string; headings: string[]; outline: OutlineItem[] } {
  const outline: OutlineItem[] = [];
  let h2 = 0;
  let h3 = 0;
  const out = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, attrs: string | undefined, inner: string) => {
    const level = Number(lvl) as 2 | 3;
    const id = level === 2 ? `part-${++h2}` : `sub-${++h3}`;
    outline.push({ level, text: plainHeading(inner), id });
    return `<h${level}${attrs ?? ''} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, headings: outline.filter((o) => o.level === 2).map((o) => o.text), outline };
}

const escText = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replaces each editor TOC placeholder (<div data-type="toc">) with a linked list built from the outline. */
export function renderToc(html: string, outline: OutlineItem[]): string {
  if (!/data-type="toc"/.test(html)) return html;
  const list = outline.length
    ? `<nav class="toc-inline" aria-label="תוכן עניינים"><p>במדריך הזה</p><ol>${outline.map((o) => `<li data-l="${o.level}"><a href="#${o.id}">${escText(o.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  return html.replace(/<div[^>]*data-type="toc"[^>]*>\s*<\/div>/g, list);
}

/** Outline of a body without touching it: used by the admin to show what the table of contents will contain. */
export const outlineOf = (html: string) => withHeadingIds(html).outline;

const text = (h: string) => h.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|h[2-4]|tr|blockquote|div)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

/** Plain text of an HTML fragment, one line per block. Used for the read-aloud player and the word count. */
export const htmlToText = (h: string) => text(h);

/** Plain-text mirror of the body split at each <h2>: keeps search, JSON-LD and old consumers working. Text before the first h2 goes under the title "מבוא". */
export function bodyToSections(html: string): { h: string; t: string }[] {
  const parts = html.split(/<h2(?:\s[^>]*)?>/);
  const out: { h: string; t: string }[] = [];
  const intro = text(parts[0] ?? '');
  if (intro) out.push({ h: 'מבוא', t: intro.slice(0, 8000) });
  for (const p of parts.slice(1)) {
    const [h, ...rest] = p.split('</h2>');
    out.push({ h: text(h).slice(0, 200), t: text(rest.join('')).slice(0, 8000) });
  }
  return out.filter((s) => s.h || s.t).slice(0, 20);
}

export const bodyWordCount = (html: string) => text(html).split(/\s+/).filter(Boolean).length;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Old plain sections -> HTML, so every article opens in the rich editor. */
export const sectionsToHtml = (sections: { h: string; t: string }[]) =>
  sections.map((s) => `${s.h ? `<h2>${esc(s.h)}</h2>` : ''}${s.t.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
