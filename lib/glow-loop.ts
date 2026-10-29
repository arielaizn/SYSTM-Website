// Keeps the rotating glow frames cheap. A frame only animates while it is on screen (.glow-on), each one starts at a
// different point of the loop, and the whole loop pauses while the page is scrolling (html.is-scrolling).
const HOSTS = '.lg, .btn--ice, .glow-frame, .ad-card, .ad-sticky-save, .lb-modal__box';

export function installGlowLoop() {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const html = document.documentElement;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).classList.toggle('glow-on', e.isIntersecting);
    },
    { rootMargin: '80px' },
  );
  const seen = new WeakSet<Element>();
  const add = (el: Element) => {
    if (seen.has(el)) return;
    seen.add(el);
    const h = el as HTMLElement;
    // Spread the start points and speeds so neighbouring frames never spin in lockstep.
    h.style.setProperty('--glow-delay', `${-(Math.random() * 8).toFixed(2)}s`);
    h.style.setProperty('--glow-dur', `${(7 + Math.random() * 3).toFixed(2)}s`);
    io.observe(el);
  };
  const scan = (root: ParentNode = document) => root.querySelectorAll(HOSTS).forEach(add);
  scan();

  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  let t = 0;
  const onScroll = () => {
    html.classList.add('is-scrolling');
    clearTimeout(t);
    t = window.setTimeout(() => html.classList.remove('is-scrolling'), 140);
  };
  addEventListener('scroll', onScroll, { passive: true });

  return () => {
    io.disconnect();
    mo.disconnect();
    removeEventListener('scroll', onScroll);
    clearTimeout(t);
    html.classList.remove('is-scrolling');
  };
}
