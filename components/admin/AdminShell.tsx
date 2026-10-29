'use client';

import { installGlowLoop } from '../../lib/glow-loop';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { logout } from '../../app/admin/actions';
import { Wordmark } from '../brand/Logo';
import { Icon, type IconName } from './Icon';
import { InstallApp, PwaBootstrap } from './Pwa';
import { haptic, useSheetDrag } from './sheet';

const NAV: { group?: string; href: string; label: string; icon: IconName; badge?: 'leads' }[] = [
  { href: '/admin', label: 'סקירה', icon: 'dashboard' },
  { group: 'פניות', href: '/admin/leads', label: 'לידים', icon: 'inbox', badge: 'leads' },
  { group: 'תוכן האתר', href: '/admin/services', label: 'שירותים', icon: 'grid' },
  { href: '/admin/articles', label: 'מדריכים', icon: 'doc' },
  { href: '/admin/faqs', label: 'שאלות נפוצות', icon: 'question' },
  { href: '/admin/settings', label: 'הגדרות ובאנר', icon: 'gear' },
  { group: 'שיווק', href: '/admin/pages', label: 'דפי נחיתה', icon: 'layout' },
  { href: '/admin/links', label: 'קישורים קצרים', icon: 'link' },
  { href: '/admin/seo', label: 'קידום SEO', icon: 'trend' },
  { group: 'מערכת', href: '/admin/activity', label: 'יומן פעולות', icon: 'pulse' },
  { href: '/admin/data', label: 'גיבוי וייבוא', icon: 'data' },
  { href: '/admin/security', label: 'אבטחה והתראות', icon: 'shield' },
];

const CONTENT = ['/admin/services', '/admin/articles', '/admin/faqs'];
const MORE = ['/admin/settings', '/admin/pages', '/admin/links', '/admin/seo', '/admin/activity', '/admin/data', '/admin/security'];

const isActive = (path: string, href: string) => (href === '/admin' ? path === '/admin' || path === '/admin/' : path.startsWith(href));

export function AdminShell({ newLeads, children }: { newLeads: number; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const closeMore = useCallback(() => setMore(false), []);

  useEffect(() => setMore(false), [path]);
  useEffect(() => installGlowLoop(), []);

  const onContent = CONTENT.some((h) => isActive(path, h));
  const onMore = MORE.some((h) => isActive(path, h));

  return (
    <div className="ad">
      <PwaBootstrap newLeads={newLeads} />
      <aside className="ad-side" aria-label="ניווט ניהול">
        <div className="ad-brand">
          <Wordmark />
          <small>ADMIN</small>
        </div>
        <nav className="ad-nav">
          {NAV.map((n) => (
            <span key={n.href} style={{ display: 'contents' }}>
              {n.group ? <p className="ad-nav__group">{n.group}</p> : null}
              <Link href={n.href} aria-current={isActive(path, n.href) ? 'page' : undefined}>
                <Icon name={n.icon} />
                {n.label}
                {n.badge === 'leads' && newLeads > 0 ? <em aria-label={`${newLeads} לידים חדשים`}>{newLeads}</em> : null}
              </Link>
            </span>
          ))}
        </nav>
        <div className="ad-side__foot">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="external" />
            לצפייה באתר
          </a>
          <form action={logout}>
            <button type="submit">
              <Icon name="logout" />
              יציאה
            </button>
          </form>
        </div>
      </aside>

      <main className="ad-main" id="admin-main">
        <PullToRefresh onRefresh={() => router.refresh()} />
        {children}
      </main>

      <nav className="ad-tabbar" aria-label="ניווט ראשי">
        <TabLink href="/admin" icon="dashboard" label="סקירה" active={isActive(path, '/admin')} />
        <TabLink href="/admin/leads" icon="inbox" label="לידים" active={isActive(path, '/admin/leads')} badge={newLeads} />
        <TabLink href="/admin/services" icon="grid" label="תוכן" active={onContent} />
        <button type="button" className="ad-tab-i" aria-current={onMore || more ? 'page' : undefined} aria-expanded={more} aria-haspopup="dialog" onClick={() => (haptic(8), setMore(true))}>
          <Icon name="menu" />
          <span>עוד</span>
        </button>
      </nav>

      {more ? <MoreSheet onClose={closeMore} path={path} newLeads={newLeads} /> : null}
    </div>
  );
}

function TabLink({ href, icon, label, active, badge = 0 }: { href: string; icon: IconName; label: string; active: boolean; badge?: number }) {
  return (
    <Link href={href} className="ad-tab-i" aria-current={active ? 'page' : undefined} onClick={() => haptic(6)}>
      <Icon name={icon} />
      <span>{label}</span>
      {badge > 0 ? <em aria-label={`${badge} חדשים`}>{badge > 99 ? '99+' : badge}</em> : null}
    </Link>
  );
}

/** Everything that does not fit in the tab bar, as a bottom sheet with a grab handle. */
function MoreSheet({ onClose, path, newLeads }: { onClose: () => void; path: string; newLeads: number }) {
  const panel = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  useSheetDrag(panel, handle, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="ad-sheet" role="dialog" aria-modal="true" aria-label="תפריט">
      <div className="ad-sheet__scrim" onClick={onClose} />
      <div ref={panel} className="ad-sheet__panel">
        <div ref={handle} className="ad-grab" aria-hidden="true" />
        <div className="ad-sheet__grid">
          {NAV.filter((n) => n.href !== '/admin' && n.href !== '/admin/leads').map((n) => (
            <Link key={n.href} href={n.href} className="ad-sheet__item" aria-current={isActive(path, n.href) ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
        <div className="ad-sheet__install">
          <InstallApp />
        </div>
        <div className="ad-sheet__foot">
          <a className="ad-btn" href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="external" /> לצפייה באתר
          </a>
          <form action={logout}>
            <button type="submit" className="ad-btn ad-btn--ghost">
              <Icon name="logout" /> יציאה
            </button>
          </form>
        </div>
        {newLeads > 0 ? <p className="ad-sheet__note">{newLeads} לידים מחכים למענה</p> : null}
      </div>
    </div>
  );
}

/** Pull down at the top of the page to reload the data, the way a native list does. Touch screens only. */
function PullToRefresh({ onRefresh }: { onRefresh: () => void }) {
  const ind = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ind.current;
    if (!el || !window.matchMedia('(pointer: coarse)').matches) return;
    const LIMIT = 72;
    let y0 = 0;
    let dy = 0;
    let active = false;
    let busy = false;
    const paint = (d: number, spin = false) => {
      el.style.transform = `translate(-50%, ${Math.min(d, 110) - 56}px) rotate(${d * 3}deg)`;
      el.style.opacity = String(Math.min(1, d / 40));
      el.dataset.ready = d >= LIMIT ? 'true' : 'false';
      el.dataset.spin = spin ? 'true' : 'false';
    };
    const reset = () => {
      el.style.transition = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms';
      el.style.transform = 'translate(-50%, -56px)';
      el.style.opacity = '0';
    };
    const start = (e: TouchEvent) => {
      if (busy || window.scrollY > 0 || document.body.style.overflow === 'hidden' || e.touches.length !== 1) return;
      y0 = e.touches[0].clientY;
      active = true;
      dy = 0;
      el.style.transition = 'none';
    };
    const move = (e: TouchEvent) => {
      if (!active) return;
      const raw = e.touches[0].clientY - y0;
      if (raw <= 0 || window.scrollY > 0) {
        active = false;
        reset();
        return;
      }
      dy = raw / (1 + raw / 220);
      paint(dy);
    };
    const end = () => {
      if (!active) return;
      active = false;
      if (dy >= LIMIT) {
        busy = true;
        haptic(14);
        paint(LIMIT, true);
        onRefresh();
        setTimeout(() => {
          busy = false;
          reset();
        }, 900);
      } else reset();
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    };
  }, [onRefresh]);

  return (
    <div ref={ind} className="ad-ptr" aria-hidden="true">
      <Icon name="refresh" />
    </div>
  );
}

/** Page header used by every admin screen. */
export function PageTop({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="ad-top">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="ad-top__actions">{children}</div> : null}
    </header>
  );
}
