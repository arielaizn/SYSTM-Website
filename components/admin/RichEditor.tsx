'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import Youtube from '@tiptap/extension-youtube';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronsUpDown, Code, Code2, Eraser, Highlighter, Image as ImageIcon, Info, Italic, Link2, List, ListChecks, ListTree, ListOrdered, Minus,
  MousePointerClick, Palette, Plus, Quote, Redo2, Strikethrough, Subscript as SubIcon, Superscript as SupIcon, Table2, Underline as UnderlineIcon, Undo2, SquarePlay,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Highlighted box: info / tip / warning. Stored as <div class="note-box note-box--x" data-type="callout">. */
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({ tone: { default: 'info', parseHTML: (el) => el.getAttribute('data-callout') || 'info', renderHTML: (a) => ({ 'data-callout': a.tone, class: `note-box note-box--${a.tone}` }) } }),
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0],
});

/** Table of contents placeholder. The real list is generated from the headings when the guide is shown. */
const Toc = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-type="toc"]' }],
  renderHTML: () => ['div', { 'data-type': 'toc' }],
});

/** Call-to-action button. Stored as <a class="cta-btn" href>. Inline atom kept simple: label + href. */
const CtaButton = Node.create({
  name: 'ctaButton',
  group: 'block',
  atom: true,
  addAttributes: () => ({ href: { default: '/contact/' }, label: { default: 'לשיחה קצרה' } }),
  parseHTML: () => [{ tag: 'p[data-btn] a.cta-btn', getAttrs: (el) => ({ href: (el as HTMLElement).getAttribute('href') ?? '/contact/', label: (el as HTMLElement).textContent ?? '' }) }],
  renderHTML: ({ node }) => ['p', { 'data-btn': '' }, ['a', { class: 'cta-btn', href: node.attrs.href, 'data-btn': '' }, node.attrs.label]],
});

type Cmd = { id: string; label: string; hint: string; run: (e: Editor, ask: Ask) => void };
type Ask = (kind: 'link' | 'image' | 'youtube' | 'button') => void;

const COMMANDS: Cmd[] = [
  { id: 'h2', label: 'כותרת ראשית', hint: 'h2', run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: 'h3', label: 'כותרת משנה', hint: 'h3', run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: 'ul', label: 'רשימת תבליטים', hint: 'ul', run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'ol', label: 'רשימה ממוספרת', hint: 'ol', run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: 'task', label: 'רשימת משימות', hint: 'todo', run: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'img', label: 'תמונה', hint: 'image', run: (_e, ask) => ask('image') },
  { id: 'yt', label: 'סרטון יוטיוב', hint: 'video', run: (_e, ask) => ask('youtube') },
  { id: 'table', label: 'טבלה', hint: 'table', run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'box', label: 'קופסת הדגשה', hint: 'callout', run: (e) => e.chain().focus().wrapIn('callout', { tone: 'info' }).run() },
  { id: 'btn', label: 'כפתור', hint: 'button', run: (_e, ask) => ask('button') },
  { id: 'toc', label: 'תוכן עניינים', hint: 'toc', run: (e) => e.chain().focus().insertContent({ type: 'toc' }).run() },
  { id: 'quote', label: 'ציטוט', hint: 'quote', run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', label: 'בלוק קוד', hint: 'code', run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'hr', label: 'קו מפריד', hint: 'divider', run: (e) => e.chain().focus().setHorizontalRule().run() },
];

const COLORS = ['#f5f7f7', '#acf4f8', '#7be3a1', '#ffd28a', '#ff9c8a', '#c3a6ff', '#8ab4ff', '#8a979c'];
const MARKS = ['#3b4f12', '#0e4f55', '#5a3a00', '#5a1f1a', '#3a2a66'];

function Btn({ on, off, label, active, disabled, children }: { on: () => void; off?: boolean; label: string; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="rte-btn" data-on={active || undefined} aria-pressed={active} aria-label={label} title={label} disabled={disabled ?? off} onMouseDown={(e) => e.preventDefault()} onClick={on}>
      {children}
    </button>
  );
}

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [ask, setAsk] = useState<null | { kind: 'link' | 'image' | 'youtube' | 'button'; a: string; b: string }>(null);
  const [slash, setSlash] = useState<null | { q: string; from: number; to: number; sel: number }>(null);
  const [palette, setPalette] = useState<null | 'color' | 'mark'>(null);
  const [tick, setTick] = useState(0);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, protocols: ['mailto', 'tel'], HTMLAttributes: { rel: 'noopener noreferrer' } } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360, controls: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Callout,
      Toc,
      CtaButton,
      Placeholder.configure({ placeholder: 'כותבים כאן. מקלידים / כדי לפתוח את רשימת הפקודות: כותרת, תמונה, טבלה, קופסה, כפתור ועוד.' }),
    ],
    content: value,
    editorProps: { attributes: { dir: 'rtl', class: 'rte-content article__body prose', 'aria-label': 'תוכן המדריך', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? '' : e.getHTML();
      lastEmitted.current = html;
      onChange(html);
      // Slash menu: a paragraph that starts with "/" at the caret.
      const { $from } = e.state.selection;
      const text = $from.parent.textContent;
      if ($from.parent.type.name === 'paragraph' && /^\/[^\s]{0,12}$/.test(text) && e.state.selection.empty) {
        setSlash({ q: text.slice(1), from: $from.start(), to: $from.end(), sel: 0 });
      } else setSlash(null);
    },
    onSelectionUpdate: () => setTick((t) => t + 1),
  });

  // External changes (loading a saved version): only when it differs from what we last emitted.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const pick = (e: Editor | null) =>
    e
    ? {
        bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'), code: e.isActive('code'), sub: e.isActive('subscript'), sup: e.isActive('superscript'),
        link: e.isActive('link'), ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), task: e.isActive('taskList'), quote: e.isActive('blockquote'), codeBlock: e.isActive('codeBlock'),
        table: e.isActive('table'), callout: e.isActive('callout'),
        alignR: e.isActive({ textAlign: 'right' }), alignC: e.isActive({ textAlign: 'center' }), alignL: e.isActive({ textAlign: 'left' }), alignJ: e.isActive({ textAlign: 'justify' }),
        block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : e.isActive('blockquote') ? 'quote' : e.isActive('codeBlock') ? 'code' : 'p',
        canUndo: e.can().undo(), canRedo: e.can().redo(),
      }
    : null;
  // useEditorState stays null when the editor appears after the first render (immediatelyRender: false), so fall back to a direct read.
  const live = useEditorState({ editor, selector: ({ editor: e }) => pick(e) });
  const s = live ?? pick(editor);
  void tick;
  if (!editor || !s) return <div className="rte rte--loading" aria-busy="true" />;

  const openAsk: Ask = (kind) => setAsk({ kind, a: kind === 'link' ? (editor.getAttributes('link').href as string) ?? '' : '', b: kind === 'button' ? 'לשיחה קצרה' : '' });

  function applyAsk() {
    if (!ask) return;
    const url = ask.a.trim();
    if (ask.kind === 'link') {
      if (!url) editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      else if (editor!.state.selection.empty && !editor!.isActive('link')) editor!.chain().focus().insertContent({ type: 'text', text: ask.b.trim() || url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
      else editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else if (ask.kind === 'image' && /^https:\/\//.test(url)) editor!.chain().focus().setImage({ src: url, alt: ask.b }).run();
    else if (ask.kind === 'youtube' && url) editor!.chain().focus().setYoutubeVideo({ src: url }).run();
    else if (ask.kind === 'button' && url) editor!.chain().focus().insertContent({ type: 'ctaButton', attrs: { href: url, label: ask.b || 'לשיחה קצרה' } }).run();
    setAsk(null);
  }

  const runSlash = (c: Cmd) => {
    if (!slash) return;
    editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run();
    setSlash(null);
    c.run(editor, openAsk);
  };
  const slashList = slash ? COMMANDS.filter((c) => !slash.q || c.label.includes(slash.q) || c.hint.startsWith(slash.q.toLowerCase())) : [];

  const setBlock = (v: string) => {
    const c = editor.chain().focus();
    if (v === 'p') c.setParagraph().run();
    else if (v === 'quote') c.setParagraph().toggleBlockquote().run();
    else if (v === 'code') c.toggleCodeBlock().run();
    else c.setHeading({ level: Number(v[1]) as 2 | 3 | 4 }).run();
  };

  return (
    <div className="rte" onKeyDownCapture={(e) => {
      if (!slash || !slashList.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSlash({ ...slash, sel: (slash.sel + (e.key === 'ArrowDown' ? 1 : slashList.length - 1)) % slashList.length });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runSlash(slashList[slash.sel] ?? slashList[0]);
      } else if (e.key === 'Escape') setSlash(null);
    }}>
      <div className="rte-bar" role="toolbar" aria-label="עיצוב טקסט">
        <div className="rte-grp">
          <Btn label="ביטול" on={() => editor.chain().focus().undo().run()} disabled={!s.canUndo}><Undo2 /></Btn>
          <Btn label="שחזור" on={() => editor.chain().focus().redo().run()} disabled={!s.canRedo}><Redo2 /></Btn>
          <span className="rte-sep" />
          <label className="rte-select">
            <ChevronsUpDown aria-hidden="true" />
            <select aria-label="סגנון בלוק" value={s.block} onChange={(e) => setBlock(e.target.value)}>
              <option value="p">פסקה</option>
              <option value="h2">כותרת 2</option>
              <option value="h3">כותרת 3</option>
              <option value="h4">כותרת 4</option>
              <option value="quote">ציטוט</option>
              <option value="code">קוד</option>
            </select>
          </label>
        </div>
        <div className="rte-grp">
          <Btn label="מודגש" active={s.bold} on={() => editor.chain().focus().toggleBold().run()}><Bold /></Btn>
          <Btn label="נטוי" active={s.italic} on={() => editor.chain().focus().toggleItalic().run()}><Italic /></Btn>
          <Btn label="קו תחתון" active={s.underline} on={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></Btn>
          <Btn label="קו חוצה" active={s.strike} on={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></Btn>
          <Btn label="כתב תחתי" active={s.sub} on={() => editor.chain().focus().toggleSubscript().run()}><SubIcon /></Btn>
          <Btn label="כתב עילי" active={s.sup} on={() => editor.chain().focus().toggleSuperscript().run()}><SupIcon /></Btn>
          <Btn label="קוד בשורה" active={s.code} on={() => editor.chain().focus().toggleCode().run()}><Code /></Btn>
        </div>
        <div className="rte-grp">
          <Btn label="צבע טקסט" active={palette === 'color'} on={() => setPalette(palette === 'color' ? null : 'color')}><Palette /></Btn>
          <Btn label="סימון" active={palette === 'mark'} on={() => setPalette(palette === 'mark' ? null : 'mark')}><Highlighter /></Btn>
          <Btn label="ניקוי עיצוב" on={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser /></Btn>
        </div>
        <div className="rte-grp">
          <Btn label="יישור לימין" active={s.alignR} on={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight /></Btn>
          <Btn label="מרכוז" active={s.alignC} on={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter /></Btn>
          <Btn label="יישור לשמאל" active={s.alignL} on={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft /></Btn>
          <Btn label="יישור מלא" active={s.alignJ} on={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify /></Btn>
          <span className="rte-sep" />
          <Btn label="רשימת תבליטים" active={s.ul} on={() => editor.chain().focus().toggleBulletList().run()}><List /></Btn>
          <Btn label="רשימה ממוספרת" active={s.ol} on={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Btn>
          <Btn label="רשימת משימות" active={s.task} on={() => editor.chain().focus().toggleTaskList().run()}><ListChecks /></Btn>
        </div>
        <div className="rte-grp">
          <Btn label="קישור" active={s.link} on={() => openAsk('link')}><Link2 /></Btn>
          <Btn label="תמונה" on={() => openAsk('image')}><ImageIcon /></Btn>
          <Btn label="סרטון יוטיוב" on={() => openAsk('youtube')}><SquarePlay /></Btn>
          <Btn label="טבלה" active={s.table} on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 /></Btn>
          <Btn label="בלוק קוד" active={s.codeBlock} on={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 /></Btn>
          <Btn label="ציטוט" active={s.quote} on={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></Btn>
          <Btn label="קופסת הדגשה" active={s.callout} on={() => (s.callout ? editor.chain().focus().lift('callout').run() : editor.chain().focus().wrapIn('callout', { tone: 'info' }).run())}><Info /></Btn>
          <Btn label="תוכן עניינים אוטומטי" on={() => editor.chain().focus().insertContent({ type: 'toc' }).run()}><ListTree /></Btn>
          <Btn label="כפתור" on={() => openAsk('button')}><MousePointerClick /></Btn>
          <Btn label="קו מפריד" on={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></Btn>
        </div>
      </div>

      {palette ? (
        <div className="rte-palette" role="group" aria-label={palette === 'color' ? 'צבע טקסט' : 'צבע סימון'}>
          {(palette === 'color' ? COLORS : MARKS).map((c) => (
            <button key={c} type="button" className="rte-swatch" style={{ background: c }} aria-label={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { (palette === 'color' ? editor.chain().focus().setColor(c) : editor.chain().focus().setHighlight({ color: c })).run(); setPalette(null); }} />
          ))}
          <button type="button" className="rte-swatch rte-swatch--none" aria-label="הסרה" onMouseDown={(e) => e.preventDefault()} onClick={() => { (palette === 'color' ? editor.chain().focus().unsetColor() : editor.chain().focus().unsetHighlight()).run(); setPalette(null); }}>×</button>
        </div>
      ) : null}

      {ask ? (
        <form className="rte-ask" onSubmit={(e) => { e.preventDefault(); applyAsk(); }}>
          <input className="ad-input ltr" dir="ltr" autoFocus value={ask.a} onChange={(e) => setAsk({ ...ask, a: e.target.value })} placeholder={ask.kind === 'image' ? 'https://… כתובת תמונה' : ask.kind === 'youtube' ? 'https://youtube.com/watch?v=…' : ask.kind === 'button' ? '/contact/ או https://…' : 'https://… או /knowledge/slug/'} aria-label="כתובת" />
          {ask.kind === 'image' || ask.kind === 'button' || (ask.kind === 'link' && editor.state.selection.empty && !editor.isActive('link')) ? <input className="ad-input" value={ask.b} onChange={(e) => setAsk({ ...ask, b: e.target.value })} placeholder={ask.kind === 'image' ? 'טקסט חלופי (alt)' : ask.kind === 'link' ? 'טקסט הקישור' : 'טקסט הכפתור'} aria-label={ask.kind === 'image' ? 'טקסט חלופי' : ask.kind === 'link' ? 'טקסט הקישור' : 'טקסט הכפתור'} /> : null}
          <button type="submit" className="ad-btn ad-btn--primary ad-btn--sm">{ask.kind === 'link' && !ask.a.trim() ? 'הסרת קישור' : 'הוספה'}</button>
          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setAsk(null)}>ביטול</button>
        </form>
      ) : null}

      <div className="rte-wrap">
        <EditorContent editor={editor} />
        {slash && slashList.length ? (
          <ul className="rte-slash" role="listbox" aria-label="פקודות">
            {slashList.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === slash.sel}>
                <button type="button" data-on={i === slash.sel || undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => runSlash(c)}>
                  <Plus aria-hidden="true" /> {c.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
