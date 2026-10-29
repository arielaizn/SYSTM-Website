'use client';

import { useEffect, useRef, useState } from 'react';
import type { Doc } from '../../convex/_generated/dataModel';
import { Icon } from './Icon';
import { haptic } from './sheet';
import { STATUS_LABEL, timeAgo } from './ui';

type Lead = Doc<'leads'>;

const waDigits = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? `972${d.slice(1)}` : d;
};

const REVEAL = 168; // px of action buttons behind a card

/** Phone version of the leads table: one card per lead. Swipe toward the screen edge to call or WhatsApp. */
export function MobileLeads({ rows, labels, onOpen, onContacted }: { rows: Lead[]; labels: Record<string, string>; onOpen: (id: string) => void; onContacted: (id: string) => void }) {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <ul className="ad-mcards" aria-label="רשימת לידים">
      {rows.map((l) => (
        <SwipeCard key={l._id} lead={l} label={labels[l.service] ?? l.service} isOpen={opened === l._id} setOpen={(v) => setOpened(v ? l._id : null)} onOpen={() => (opened ? setOpened(null) : onOpen(l._id))} onContacted={() => onContacted(l._id)} />
      ))}
    </ul>
  );
}

function SwipeCard({ lead, label, isOpen, setOpen, onOpen, onContacted }: { lead: Lead; label: string; isOpen: boolean; setOpen: (v: boolean) => void; onOpen: () => void; onContacted: () => void }) {
  const face = useRef<HTMLButtonElement>(null);
  const drag = useRef({ x0: 0, y0: 0, base: 0, x: 0, t0: 0, mode: 'idle' as 'idle' | 'h' | 'v', moved: false });

  const set = (x: number, animate: boolean) => {
    const el = face.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
    el.style.transform = x ? `translateX(${x}px)` : '';
  };

  // Keep the visual state in step with the parent (only one card open at a time).
  useEffect(() => {
    if (drag.current.mode === 'idle') set(isOpen ? -REVEAL : 0, true);
  }, [isOpen]);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const d = drag.current;
    d.x0 = e.clientX;
    d.y0 = e.clientY;
    d.base = isOpen ? -REVEAL : 0;
    d.x = d.base;
    d.t0 = performance.now();
    d.mode = 'idle';
    d.moved = false;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (e.pointerType === 'mouse' || d.t0 === 0) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (d.mode === 'idle') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        d.mode = 'v';
        return;
      }
      if (Math.abs(dx) > 8) {
        d.mode = 'h';
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (d.mode !== 'h') return;
    d.moved = true;
    const raw = d.base + dx;
    const x = raw > 0 ? raw / (1 + raw / 40) : raw < -REVEAL ? -REVEAL + (raw + REVEAL) / (1 + Math.abs(raw + REVEAL) / 50) : raw;
    d.x = x;
    set(x, false);
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    if (e.pointerType === 'mouse' || d.t0 === 0) return;
    const velocity = (d.x - d.base) / Math.max(1, performance.now() - d.t0);
    const open = d.mode === 'h' ? (velocity < -0.4 ? true : velocity > 0.4 ? false : d.x < -REVEAL / 2) : isOpen;
    if (d.mode === 'h') {
      if (open !== isOpen) haptic(10);
      set(open ? -REVEAL : 0, true);
      setOpen(open);
    }
    d.t0 = 0;
    // The click that follows a swipe must not open the lead.
    setTimeout(() => (d.mode = 'idle'), 0);
  };

  const wa = `https://wa.me/${waDigits(lead.phone)}`;
  return (
    <li className="ad-mcard" data-status={lead.status}>
      <div className="ad-mcard__actions" aria-hidden={!isOpen}>
        <a href={`tel:${lead.phone}`} className="ad-mcard__act" data-k="call" tabIndex={isOpen ? 0 : -1} onClick={() => haptic(10)}>
          <Icon name="phone" />
          חיוג
        </a>
        <a href={wa} className="ad-mcard__act" data-k="wa" target="_blank" rel="noopener noreferrer" tabIndex={isOpen ? 0 : -1} onClick={() => haptic(10)}>
          <Icon name="whatsapp" />
          וואטסאפ
        </a>
        {lead.status === 'new' ? (
          <button type="button" className="ad-mcard__act" data-k="done" tabIndex={isOpen ? 0 : -1} onClick={onContacted}>
            <Icon name="check" />
            טופל
          </button>
        ) : null}
      </div>
      <button
        ref={face}
        type="button"
        className="ad-mcard__face"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={(e) => {
          if (drag.current.moved) {
            drag.current.moved = false;
            e.preventDefault();
            return;
          }
          onOpen();
        }}
      >
        <span className="ad-mcard__top">
          <b>{lead.name}</b>
          <span className="ad-badge" data-s={lead.status}>
            {STATUS_LABEL[lead.status]}
          </span>
        </span>
        <span className="ad-mcard__meta">
          {label}
          {lead.company ? ` · ${lead.company}` : ''}
        </span>
        {lead.message ? <span className="ad-mcard__msg">{lead.message}</span> : null}
        <span className="ad-mcard__foot">
          <span dir="ltr">{lead.phone}</span>
          <span suppressHydrationWarning>{timeAgo(lead.createdAt)}</span>
        </span>
      </button>
    </li>
  );
}
