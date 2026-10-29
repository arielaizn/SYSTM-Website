'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when `value` matches no option (for example "Change status…"). */
  placeholder?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** field = form input look (admin), bar = compact toolbar button, pill = quiet outline (public site). */
  variant?: 'field' | 'bar' | 'pill';
  className?: string;
  style?: CSSProperties;
  /** The menu is at least this wide even when the trigger is narrower. */
  menuMinWidth?: number;
};

type Pos = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

/**
 * A fully styled dropdown that replaces the native <select>, whose open menu is drawn by the operating system and
 * cannot be themed. Same contract as a select (value / onChange), plus the keyboard behaviour of the ARIA
 * "select-only combobox" pattern: Enter, Space and the arrows open it, arrows / Home / End move, typing jumps to a
 * matching option, Enter picks, Escape and Tab close. The menu is rendered in a portal so no parent with
 * overflow:hidden, a sticky bar or a transform can clip it, and it flips upwards when there is no room below.
 */
export function Select({ value, onChange, options, placeholder, id, name, disabled, variant = 'field', className = '', style, menuMinWidth = 0, ...rest }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const typed = useRef({ text: '', t: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = selectedIndex >= 0 ? options[selectedIndex] : null;

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.max(r.width, menuMinWidth);
    const rtl = getComputedStyle(el).direction === 'rtl';
    let left = rtl ? r.right - width : r.left;
    left = Math.min(Math.max(margin, left), Math.max(margin, innerWidth - width - margin));
    const below = innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const want = Math.min(320, options.length * 40 + 12);
    if (below >= Math.min(want, 180) || below >= above) setPos({ top: r.bottom + 6, left, width, maxHeight: Math.max(120, Math.min(320, below - 6)) });
    else setPos({ bottom: innerHeight - r.top + 6, left, width, maxHeight: Math.max(120, Math.min(320, above - 6)) });
  }, [menuMinWidth, options.length]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : Math.max(0, options.findIndex((o) => !o.disabled)));
    place();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || trigger.current?.contains(t)) return;
      setOpen(false);
    };
    const reposition = () => place();
    document.addEventListener('pointerdown', onDown);
    addEventListener('resize', reposition);
    addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      removeEventListener('resize', reposition);
      removeEventListener('scroll', reposition, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, pos]);

  const step = (from: number, dir: 1 | -1) => {
    for (let n = 1; n <= options.length; n++) {
      const i = (from + dir * n + options.length * n) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };
  const pick = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    if (o.value !== value) onChange(o.value);
    close();
  };

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (k === 'Escape') {
      e.preventDefault();
      close();
    } else if (k === 'Tab') setOpen(false);
    else if (k === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => step(a, 1));
    } else if (k === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => step(a, -1));
    } else if (k === 'Home') {
      e.preventDefault();
      setActive(step(-1, 1));
    } else if (k === 'End') {
      e.preventDefault();
      setActive(step(0, -1));
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(active);
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current.text = now - typed.current.t > 700 ? k.toLocaleLowerCase() : typed.current.text + k.toLocaleLowerCase();
      typed.current.t = now;
      const i = options.findIndex((o) => !o.disabled && o.label.toLocaleLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        id={id}
        className={`sel sel--${variant}${open ? ' is-open' : ''} ${className}`.trim()}
        style={style}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${uid}-o${active}` : undefined}
        aria-label={rest['aria-label']}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={`sel__value${current ? '' : ' sel__value--ph'}`}>{current ? current.label : placeholder ?? ''}</span>
        <svg className="sel__chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {open && pos
        ? createPortal(
            <ul
              ref={menu}
              id={listId}
              role="listbox"
              aria-label={rest['aria-label']}
              className="sel-menu"
              dir={document.documentElement.dir || 'rtl'}
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${uid}-o${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  data-active={i === active || undefined}
                  className="sel-opt"
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => pick(i)}
                >
                  <span>{o.label}</span>
                  {o.value === value ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}
