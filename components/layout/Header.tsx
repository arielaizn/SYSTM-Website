'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nav } from '../../lib/content';
import { useContent } from './ContentContext';
import { Wordmark } from '../brand/Logo';
import { MotionToggle } from '../motion/MotionToggle';
import { Btn } from '../ui/Btn';
import { ArrowUpLeft, Search } from '../ui/Icons';
import { SmartLink } from '../ui/SmartLink';

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href);

export function Header() {
  const { services, articles } = useContent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState<'services' | 'knowledge' | null>(null);
  const [isMac, setIsMac] = useState(false);
  const closeTimer = useRef<number>(0);
  const header = useRef<HTMLElement>(null);
  const openMega = (k: 'services' | 'knowledge' | null) => {
    clearTimeout(closeTimer.current);
    setMega(k);
  };
  const closeMegaSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMega(null), 140);
  };
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);

  // The lens: a sliver of glass under the hovered (or current) link.
  const placeLens = useCallback((el: HTMLElement | null) => {
    const wrap = links.current;
    if (!wrap) return;
    if (!el) {
      wrap.style.setProperty('--lo', '0');
      return;
    }
    const w = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    wrap.style.setProperty('--lx', `${r.left - w.left}px`);
    wrap.style.setProperty('--lw', `${r.width}px`);
    wrap.style.setProperty('--lo', '1');
  }, []);

  const restLens = useCallback(() => {
    placeLens(links.current?.querySelector<HTMLElement>('a[aria-current="page"]') ?? null);
  }, [placeLens]);

  useEffect(() => {
    restLens();
    const onResize = () => restLens();
    addEventListener('resize', onResize);
    document.fonts?.ready.then(restLens);
    return () => removeEventListener('resize', onResize);
  }, [pathname, restLens]);

  useEffect(() => {
    setOpen(false);
    setMega(null);
  }, [pathname]);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMega(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mega]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(scrollY > 24);
      });
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!sheet.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    const mq = matchMedia('(min-width: 901px)');
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      mq.removeEventListener('change', onMq);
    };
  }, [open]);

  const mobileItems = [...nav, { href: '/contact/', label: 'יצירת קשר' }];

  return (
    <header ref={header} className="site-header" data-scrolled={scrolled} onPointerLeave={closeMegaSoon} onBlur={(e) => { if (!header.current?.contains(e.relatedTarget as Node)) setMega(null); }}>
      <div className="nav lg" data-refract="22">
        <SmartLink href="/" className="nav__logo" aria-label="SYSTM, דף הבית">
          <Wordmark />
        </SmartLink>

        <nav className="nav__links" aria-label="ניווט ראשי" ref={links} onPointerLeave={restLens} onBlur={restLens}>
          <span className="nav__lens" aria-hidden="true" />
          {nav.map((item) => (
            <SmartLink
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              onPointerEnter={(e) => {
                placeLens(e.currentTarget);
                openMega(item.href === '/services/' ? 'services' : item.href === '/knowledge/' ? 'knowledge' : null);
              }}
              onFocus={(e) => {
                placeLens(e.currentTarget);
                openMega(item.href === '/services/' ? 'services' : item.href === '/knowledge/' ? 'knowledge' : null);
              }}
              aria-haspopup={item.href === '/services/' || item.href === '/knowledge/' ? 'true' : undefined}
              aria-expanded={item.href === '/services/' ? mega === 'services' : item.href === '/knowledge/' ? mega === 'knowledge' : undefined}
            >
              {item.label}
            </SmartLink>
          ))}
        </nav>

        <div className="nav__actions">
          <button type="button" className="nav__search" aria-label="חיפוש באתר" onClick={() => dispatchEvent(new Event('systm:search'))}>
            <Search />
            <kbd aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <MotionToggle />
          <Btn href="/contact/" size="sm" noReveal className="nav__cta">
            בואו נדבר
          </Btn>
          <button
            ref={menuBtn}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`mega lg lg--dense${mega ? ' is-open' : ''}`} inert={!mega} onPointerEnter={() => clearTimeout(closeTimer.current)}>
        {mega === 'services' ? (
          <div className="mega__grid">
            {services.map((sv) => (
              <SmartLink key={sv.slug} href={`/services/${sv.slug}/`} className="mega__item">
                <span className="mega__n">{sv.number}</span>
                <b>{sv.label}</b>
                <small>{sv.short}</small>
              </SmartLink>
            ))}
            <SmartLink href="/services/" className="mega__all">
              לכל הפתרונות <ArrowUpLeft />
            </SmartLink>
          </div>
        ) : null}
        {mega === 'knowledge' ? (
          <div className="mega__grid mega__grid--3">
            {articles.map((a, i) => (
              <SmartLink key={a.slug} href={`/knowledge/${a.slug}/`} className="mega__item">
                <span className="mega__n">{a.category}</span>
                <b>{a.title}</b>
                <small>{a.read}</small>
              </SmartLink>
            ))}
            <SmartLink href="/knowledge/" className="mega__all">
              לכל המדריכים <ArrowUpLeft />
            </SmartLink>
          </div>
        ) : null}
      </div>

      <nav id="mobile-menu" ref={sheet} className={`sheet lg${open ? ' is-open' : ''}`} aria-label="ניווט במובייל" inert={!open}>
        {mobileItems.map((item) => (
          <SmartLink key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
            {item.label}
            <ArrowUpLeft />
          </SmartLink>
        ))}
      </nav>
    </header>
  );
}
