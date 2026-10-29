// Real refraction for glass surfaces, in Chromium. For every [data-refract] element we paint a displacement map
// (a squircle bezel whose vectors point inward) and feed it to an SVG feDisplacementMap used inside
// `backdrop-filter: url(#id)`. Safari and Firefox ignore url() in backdrop-filter, so they keep the blur + rim
// look from glass.css. Skipped on touch/narrow screens (cost) and when the OS asks for reduced transparency.

const SVG_NS = 'http://www.w3.org/2000/svg';
const mapCache = new Map<string, string>();
const filters = new WeakMap<HTMLElement, { id: string; key: string }>();
let defs: SVGDefsElement | null = null;
let counter = 0;

export function refractionSupported() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const chromium = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\/|Firefox\//.test(ua);
  return (
    chromium &&
    !matchMedia('(prefers-reduced-transparency: reduce)').matches &&
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    innerWidth >= 900
  );
}

function makeMap(w: number, h: number, r: number, bezel: number) {
  const key = `${w}x${h}r${r}b${bezel}`;
  const cached = mapCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const hw = w / 2;
  const hh = h / 2;
  const cx = hw - r;
  const cy = hh - r;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx = x + 0.5 - hw;
      const ry = y + 0.5 - hh;
      const ax = Math.abs(rx);
      const ay = Math.abs(ry);
      let dist: number;
      let nx: number;
      let ny: number;
      if (ax > cx && ay > cy) {
        const dx = ax - cx;
        const dy = ay - cy;
        const len = Math.hypot(dx, dy) || 1;
        dist = r - len;
        nx = ((rx < 0 ? -1 : 1) * dx) / len;
        ny = ((ry < 0 ? -1 : 1) * dy) / len;
      } else if (hw - ax < hh - ay) {
        dist = hw - ax;
        nx = rx < 0 ? -1 : 1;
        ny = 0;
      } else {
        dist = hh - ay;
        nx = 0;
        ny = ry < 0 ? -1 : 1;
      }
      const i = (y * w + x) * 4;
      let vx = 0;
      let vy = 0;
      if (dist >= 0) {
        const t = Math.min(1, dist / bezel);
        // Convex-lens falloff: strongest on the rim, nothing in the flat middle.
        const mag = Math.pow(1 - t, 2.4);
        vx = -nx * mag;
        vy = -ny * mag;
      }
      px[i] = 128 + vx * 127;
      px[i + 1] = 128 + vy * 127;
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  mapCache.set(key, url);
  return url;
}

function ensureDefs() {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
  defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

function radiusOf(el: HTMLElement, w: number, h: number) {
  const raw = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return Math.max(2, Math.min(raw, w / 2, h / 2));
}

function apply(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w < 24 || h < 24 || w > 1400 || h > 900) return;
  const r = radiusOf(el, w, h);
  const bezel = Math.min(parseFloat(el.dataset.refract ?? '') || 18, Math.min(w, h) / 2);
  const key = `${w}x${h}r${Math.round(r)}b${bezel}`;
  const prev = filters.get(el);
  if (prev?.key === key) return;

  const href = makeMap(w, h, r, bezel);
  if (!href) return;
  const id = prev?.id ?? `lgf-${++counter}`;
  let f = document.getElementById(id) as unknown as SVGFilterElement | null;
  if (!f) {
    f = document.createElementNS(SVG_NS, 'filter');
    f.setAttribute('id', id);
    ensureDefs().appendChild(f);
  }
  f.setAttribute('filterUnits', 'userSpaceOnUse');
  f.setAttribute('primitiveUnits', 'userSpaceOnUse');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.setAttribute('x', '0');
  f.setAttribute('y', '0');
  f.setAttribute('width', String(w));
  f.setAttribute('height', String(h));
  f.innerHTML =
    `<feImage href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${Math.round(bezel * 1.9)}" xChannelSelector="R" yChannelSelector="G"/>`;
  filters.set(el, { id, key });
  el.style.setProperty('--lg-bf', `url(#${id}) blur(1.5px) saturate(1.8) brightness(1.1)`);
}

export function installLiquidGlass() {
  if (!refractionSupported()) return () => {};
  const seen = new WeakSet<HTMLElement>();
  const ro = new ResizeObserver((entries) => entries.forEach((e) => apply(e.target as HTMLElement)));
  const scan = () =>
    document.querySelectorAll<HTMLElement>('[data-refract]').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      ro.observe(el);
    });
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
    ro.disconnect();
    mo.disconnect();
  };
}

/** Pointer-driven light for every .lg (rim arc + glare). Delegated, one rAF per move. */
export function installPointerLight() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  let raf = 0;
  let last: PointerEvent | null = null;
  const tick = () => {
    raf = 0;
    if (!last) return;
    const el = (last.target as Element | null)?.closest?.('.lg') as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${last.clientX - r.left}px`);
      el.style.setProperty('--my', `${last.clientY - r.top}px`);
    }
  };
  const onMove = (e: PointerEvent) => {
    last = e;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  document.addEventListener('pointermove', onMove, { passive: true });
  return () => document.removeEventListener('pointermove', onMove);
}
