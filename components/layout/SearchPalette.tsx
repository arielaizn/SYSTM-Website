'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSearchIndex, searchSite } from '../../lib/search-index';
import { useContent } from './ContentContext';
import { navigate } from '../../lib/transition';
import { ArrowUpLeft, Search } from '../ui/Icons';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

/** Site-wide search. Opens with the header button, Ctrl/Cmd+K or "/". Keyboard-first: arrows, Enter, Escape. */
export function SearchPalette() {
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const content = useContent();
  const index = useMemo(() => buildSearchIndex(content), [content]);
  const results = useMemo(() => searchSite(index, q), [index, q])

  const show = useCallback(() => {
    const d = dlg.current;
    if (!d || d.open) return;
    setQ('');
    setIdx(0);
    d.showModal();
    requestAnimationFrame(() => input.current?.focus());
  }, []);
  const hide = useCallback(() => dlg.current?.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dlg.current?.open) hide();
        else show();
      } else if (e.key === '/' && !isTyping(e.target) && !dlg.current?.open) {
        e.preventDefault();
        show();
      }
    };
    addEventListener('keydown', onKey);
    addEventListener('systm:search', show);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('systm:search', show);
    };
  }, [show, hide]);

  const go = (href: string) => {
    hide();
    navigate(router, href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => (i + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results[idx]) {
      e.preventDefault();
      go(results[idx].href);
    }
  };

  let lastGroup = '';
  return (
    <dialog
      ref={dlg}
      className="palette lg lg--dense"
      aria-label="חיפוש באתר"
      onClick={(e) => e.target === dlg.current && hide()}
    >
      <div className="palette__bar">
        <Search />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[idx] ? `pal-${idx}` : undefined}
          placeholder="חיפוש בפתרונות, במדריכים ובעמודים"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
          }}
          onKeyDown={onInputKey}
          autoComplete="off"
        />
        <kbd>Esc</kbd>
      </div>
      <ul id="palette-list" role="listbox" className="palette__list" aria-label="תוצאות">
        {results.length === 0 ? <li className="palette__empty">לא נמצאו תוצאות. נסו מילה אחרת.</li> : null}
        {results.map((r, i) => {
          const header = r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          return (
            <li key={r.href} role="presentation">
              {header ? <p className="palette__group">{header}</p> : null}
              <button
                type="button"
                id={`pal-${i}`}
                role="option"
                aria-selected={i === idx}
                className="palette__item"
                onPointerMove={() => setIdx(i)}
                onClick={() => go(r.href)}
              >
                <span>
                  <b>{r.title}</b>
                  <small>{r.hint}</small>
                </span>
                <ArrowUpLeft />
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
