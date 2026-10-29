// Motion preference store + the blur-reveal engine. One IntersectionObserver per threshold bucket, no scroll
// handlers. Behaviour per docs/04: 8px -> 0 blur, opacity 0 -> 1, 800ms ease-out, trigger at 30% visibility,
// repeat on re-entry, focus inside a block always shows it, tall blocks get a threshold they can actually reach.
import { site } from './config';

type Listener = () => void;
const listeners = new Set<Listener>();
let userOff = false;
let systemReduced = false;

export const motionStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => (userOff ? 1 : 0) + (systemReduced ? 2 : 0),
  getServerSnapshot: () => 0,
};

const emit = () => listeners.forEach((l) => l());

const html = () => document.documentElement;
const seen = new WeakSet<Element>();
const buckets = new Map<number, IntersectionObserver>();

function bucket(th: number) {
  let io = buckets.get(th);
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const visible = e.isIntersecting && e.intersectionRatio >= th - 0.001;
        el.classList.toggle('is-visible', visible || el.contains(document.activeElement));
        if (visible && !site.motion.repeat) io!.unobserve(el);
      }
    },
    { threshold: [0, th] },
  );
  buckets.set(th, io);
  return io;
}

function thresholdFor(el: HTMLElement) {
  const h = el.getBoundingClientRect().height || 1;
  const reachable = (innerHeight * 0.92) / h;
  return Math.round(Math.min(site.motion.threshold, Math.max(0.04, reachable)) * 20) / 20;
}

function observe(el: HTMLElement) {
  if (seen.has(el)) return;
  seen.add(el);
  bucket(thresholdFor(el)).observe(el);
}

function scan(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach(observe);
}

function applyMode() {
  const disabled = userOff || systemReduced || !('IntersectionObserver' in window);
  const d = html();
  d.classList.toggle('motion-off', disabled);
  d.classList.toggle('motion-enabled', !disabled);
  if (!disabled) {
    // Re-arm: unobserve + observe makes the browser deliver a fresh initial state for every block.
    buckets.forEach((io) => io.disconnect());
    buckets.clear();
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      seen.delete(el);
      observe(el);
    });
  }
}

export function setMotionOff(next: boolean) {
  userOff = next;
  try {
    localStorage.setItem('systm-motion', next ? 'off' : 'on');
  } catch {}
  applyMode();
  emit();
}

let installed = false;

export function installMotion() {
  if (installed) return;
  installed = true;
  try {
    userOff = localStorage.getItem('systm-motion') === 'off';
  } catch {}
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  systemReduced = mq.matches;
  mq.addEventListener('change', () => {
    systemReduced = mq.matches;
    applyMode();
    emit();
  });

  const d = html();
  const disabled = userOff || systemReduced || !('IntersectionObserver' in window);
  d.classList.toggle('motion-off', disabled);
  d.classList.toggle('motion-enabled', !disabled);
  const w = window as Window & { __revealWatchdog?: number };
  if (w.__revealWatchdog) clearTimeout(w.__revealWatchdog);

  if (!disabled) scan();
  emit();

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!html().classList.contains('motion-off')) scan();
    });
  }).observe(document.body, { childList: true, subtree: true });

  // Anchor jumps and keyboard focus must never leave their target blurred.
  document.addEventListener('focusin', (e) => (e.target as Element).closest?.('[data-reveal]')?.classList.add('is-visible'));
  addEventListener('pageshow', () => applyMode());
}
