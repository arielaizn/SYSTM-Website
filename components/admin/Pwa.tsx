'use client';

import { useCallback, useEffect, useState } from 'react';
import { pushSubscribe, pushTest, pushUnsubscribe } from '../../app/admin/actions';
import { Icon } from './Icon';
import { useAct } from './ui';

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: InstallEvent | null = null;

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Registers the admin service worker, keeps the app-icon badge in step with new leads, and catches the install prompt. */
export function PwaBootstrap({ newLeads }: { newLeads: number }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      window.dispatchEvent(new Event('systm-installable'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (newLeads > 0) nav.setAppBadge?.(newLeads).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [newLeads]);

  return null;
}

type Install = 'installed' | 'prompt' | 'ios' | 'none';

export function useInstall() {
  const [state, setState] = useState<Install>('none');
  useEffect(() => {
    const read = () => setState(standalone() ? 'installed' : deferred ? 'prompt' : isIos() ? 'ios' : 'none');
    read();
    window.addEventListener('systm-installable', read);
    return () => window.removeEventListener('systm-installable', read);
  }, []);
  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    setState(standalone() ? 'installed' : 'none');
  }, []);
  return { state, install };
}

/** Install button, or the one-line instruction iOS needs because Safari has no install prompt. */
export function InstallApp() {
  const { state, install } = useInstall();
  if (state === 'installed') return <p className="ad-pwa__ok"><Icon name="check" /> האפליקציה מותקנת במכשיר הזה</p>;
  if (state === 'prompt')
    return (
      <button type="button" className="ad-btn ad-btn--primary" onClick={install}>
        <Icon name="download" /> התקנה כאפליקציה
      </button>
    );
  if (state === 'ios') return <p className="ad-muted">באייפון: לוחצים על כפתור השיתוף בספארי ובוחרים ״הוספה למסך הבית״. אחרי זה גם ההתראות זמינות.</p>;
  return <p className="ad-muted">בדפדפן הזה אין התקנה. אפשר לפתוח את הכתובת בכרום או בספארי.</p>;
}

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'מכשיר';
  const br = /edg/i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : '';
  return `${os}${br ? ` · ${br}` : ''}`;
}

type PushState = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

/** Turns new-lead notifications on or off for this device. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<PushState>('loading');
  const { act, pending } = useAct();

  const read = useCallback(async () => {
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState(isIos() && !standalone() ? 'needs-install' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') return setState('denied');
    const reg = await navigator.serviceWorker.getRegistration('/admin/');
    const sub = await reg?.pushManager.getSubscription();
    setState(sub ? 'on' : 'off');
  }, [publicKey]);

  useEffect(() => {
    read().catch(() => setState('unsupported'));
  }, [read]);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return setState(perm === 'denied' ? 'denied' : 'off');
    const reg = (await navigator.serviceWorker.getRegistration('/admin/')) ?? (await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const json = sub.toJSON();
    const r = await act(() => pushSubscribe({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '', label: deviceLabel() }), 'ההתראות פועלות במכשיר הזה');
    if (r.ok) setState('on');
    else await sub.unsubscribe().catch(() => {});
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration('/admin/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await act(() => pushUnsubscribe(sub.endpoint), 'ההתראות כובו במכשיר הזה');
      await sub.unsubscribe().catch(() => {});
    }
    setState('off');
  }

  if (state === 'loading') return <p className="ad-muted">בודקים תמיכה...</p>;
  if (state === 'unsupported') return <p className="ad-muted">הדפדפן הזה לא תומך בהתראות דחיפה.</p>;
  if (state === 'needs-install') return <p className="ad-muted">באייפון ההתראות עובדות רק אחרי שמוסיפים את הניהול למסך הבית ופותחים אותו משם.</p>;
  if (state === 'denied') return <p className="ad-muted">ההתראות חסומות לאתר הזה. אפשר לאשר אותן בהגדרות הדפדפן ולחזור לכאן.</p>;
  return (
    <div className="ad-actions">
      {state === 'on' ? (
        <>
          <button type="button" className="ad-btn" onClick={() => act(() => pushTest(), 'נשלחה התראת בדיקה')} disabled={pending}>
            <Icon name="check" /> שליחת התראת בדיקה
          </button>
          <button type="button" className="ad-btn ad-btn--ghost" onClick={disable} disabled={pending}>
            כיבוי במכשיר הזה
          </button>
        </>
      ) : (
        <button type="button" className="ad-btn ad-btn--primary" onClick={enable} disabled={pending}>
          התראה על כל ליד חדש
        </button>
      )}
    </div>
  );
}
