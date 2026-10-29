// Rotating glow frames, kept cheap.
//   - Each frame gets a .rim element (see styles/glass.css). Its rotation is a transform animation: compositor only.
//   - A frame only animates while it is on screen (.glow-on, via IntersectionObserver), with its own start point and speed.
//   - --rim (the frame's diagonal) is kept up to date so the rotating gradient always covers the whole border.
// Nothing here runs on scroll, and no class is toggled on <html> while scrolling.
const HOSTS = '.lg, .btn--ice, .glow-frame, .ad-card, .ad-sticky-save, .lb-modal__box';

export function installGlowLoop() {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).classList.toggle('glow-on', e.isIntersecting);
    },
    { rootMargin: '80px' },
  );
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const { width, height } = e.contentRect;
      (e.target as HTMLElement).style.setProperty('--rim', `${Math.ceil(Math.hypot(width, height))}px`);
    }
  });
  const seen = new WeakSet<Element>();
  const add = (el: Element) => {
    if (seen.has(el)) return;
    seen.add(el);
    const h = el as HTMLElement;
    // <details> hides every child that is not its summary, and inputs cannot have children: those keep the static rim.
    if (h.tagName === 'DETAILS' || h.tagName === 'INPUT') return;
    if (!h.querySelector(':scope > .rim')) {
      const rim = document.createElement('i');
      rim.className = 'rim';
      rim.setAttribute('aria-hidden', 'true');
      rim.append(document.createElement('b'));
      h.prepend(rim);
    }
    h.style.setProperty('--glow-delay', `${-(Math.random() * 6).toFixed(2)}s`);
    h.style.setProperty('--glow-dur', `${(5 + Math.random() * 2.5).toFixed(2)}s`);
    io.observe(h);
    ro.observe(h);
  };
  const scan = () => document.querySelectorAll(HOSTS).forEach(add);
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

  return () => {
    io.disconnect();
    ro.disconnect();
    mo.disconnect();
  };
}
