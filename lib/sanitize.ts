import sanitizeHtml from 'sanitize-html';

/** Allow-list for the rich-text body written in the admin editor. Everything else is stripped, on save and again on render. */
const YOUTUBE = /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/[\w-]{6,20}(\?[\w=&%-]*)?$/;
const SAFE_URL = /^(\/(?!\/)|https:\/\/|mailto:|tel:|#)/;

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col', 'sub', 'sup', 'mark', 'span', 'div', 'iframe', 'label', 'input', 'figure', 'figcaption'],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'class', 'data-btn'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'allowfullscreen', 'title', 'loading', 'allow', 'referrerpolicy', 'data-youtube-video'],
      td: ['colspan', 'rowspan', 'colwidth'],
      th: ['colspan', 'rowspan', 'colwidth'],
      div: ['class', 'data-type', 'data-callout', 'data-youtube-video'],
      ul: ['data-type'],
      li: ['data-type', 'data-checked'],
      input: ['type', 'checked', 'disabled'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      span: ['style'],
      mark: ['style', 'data-color'],
      pre: ['class'],
      code: ['class'],
    },
    allowedStyles: {
      '*': { 'text-align': [/^(left|right|center|justify)$/], color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i], 'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i] },
    },
    allowedClasses: { div: ['note-box', 'note-box--info', 'note-box--warn', 'note-box--tip', 'video'], a: ['cta-btn'], pre: ['*'], code: ['*'] },
    allowedSchemes: ['https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    exclusiveFilter: (f) => (f.tag === 'img' && !f.attribs.src) || (f.tag === 'iframe' && !YOUTUBE.test(f.attribs.src ?? '')) || (f.tag === 'input' && f.attribs.type !== 'checkbox'),
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href ?? '';
        if (!SAFE_URL.test(href)) return { tagName: 'span', attribs: {} };
        const external = /^https:\/\//.test(href);
        return { tagName: 'a', attribs: { ...attribs, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : { target: '', rel: '' }) } };
      },
      input: (tag, attribs) => ({ tagName: 'input', attribs: { ...attribs, disabled: 'disabled' } }),
    },
  });
}

/** Adds ids to <h2> so the table of contents can link to them, and returns the headings. */
export function withHeadingIds(html: string): { html: string; headings: string[] } {
  const headings: string[] = [];
  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (_m, attrs: string | undefined, inner: string) => {
    headings.push(inner.replace(/<[^>]+>/g, '').trim());
    return `<h2${attrs ?? ''} id="part-${headings.length}">${inner}</h2>`;
  });
  return { html: out, headings };
}

const text = (h: string) => h.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|h[2-4]|tr|blockquote|div)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

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
