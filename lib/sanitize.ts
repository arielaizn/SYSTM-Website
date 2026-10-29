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

export * from './html-utils.ts';
