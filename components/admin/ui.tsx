'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { R } from '../../app/admin/actions';
import { Icon } from './Icon';
import { useSheetDrag } from './sheet';
export { fmtDate, STATUS_LABEL, STATUSES, timeAgo } from '../../lib/format';

// Small client toolkit shared by every admin screen: toasts, confirm dialog, an action runner with pending state.

type ToastKind = 'ok' | 'error';
type Toast = { id: number; kind: ToastKind; text: string };
type ConfirmOpts = { title: string; text?: string; confirm?: string; danger?: boolean };

type Ctx = {
  toast: (text: string, kind?: ToastKind) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
};

const C = createContext<Ctx | null>(null);

export function AdminProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setAsk({ ...o, resolve })), []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (ask && !d.open) d.showModal();
    if (!ask && d.open) d.close();
  }, [ask]);

  const answer = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };

  return (
    <C.Provider value={{ toast, confirm }}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="ad-toast" data-k={t.kind}>
            <Icon name={t.kind === 'ok' ? 'check' : 'alert'} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <dialog ref={dlg} className="ad-modal" onClose={() => ask && answer(false)} onClick={(e) => e.target === dlg.current && answer(false)}>
        {ask ? (
          <div className="ad-modal__body">
            <h2>{ask.title}</h2>
            {ask.text ? <p className="ad-muted" style={{ color: 'var(--ad-muted)' }}>{ask.text}</p> : null}
            <div className="ad-modal__foot">
              <button type="button" className={`ad-btn ${ask.danger ? 'ad-btn--danger' : 'ad-btn--primary'}`} onClick={() => answer(true)}>
                {ask.confirm ?? 'אישור'}
              </button>
              <button type="button" className="ad-btn" onClick={() => answer(false)} autoFocus>
                ביטול
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </C.Provider>
  );
}

export function useAdmin() {
  const c = useContext(C);
  if (!c) throw new Error('useAdmin must be used inside <AdminProviders>');
  return c;
}

/** Runs a server action, shows a toast for the outcome and tracks the pending state of the calling button. */
export function useAct() {
  const { toast } = useAdmin();
  const [pending, setPending] = useState(false);
  const act = useCallback(
    async <T,>(fn: () => Promise<R<T>>, success?: string): Promise<R<T>> => {
      setPending(true);
      try {
        const r = await fn();
        if (r.ok) {
          if (success) toast(success);
        } else {
          toast(r.error, 'error');
        }
        return r;
      } catch {
        toast('הפעולה נכשלה. בדקו את החיבור ונסו שוב', 'error');
        return { ok: false, error: 'network' };
      } finally {
        setPending(false);
      }
    },
    [toast],
  );
  return { act, pending };
}

export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  const panel = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  useSheetDrag(panel, handle, onClose, open);
  if (!open) return null;
  return (
    <div className="ad-drawer" role="dialog" aria-modal="true" aria-label={label}>
      <div className="ad-drawer__scrim" onClick={onClose} />
      <div ref={panel} className="ad-drawer__panel">
        <div ref={handle} className="ad-grab ad-grab--drawer" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="ad-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
