// Generated guide covers. Every guide gets its own composition of three glass panes, derived from its slug, so a new
// guide has a cover the moment it exists and the cover does not change when guides are reordered. The admin can
// re-roll the seed or pick one of the eight styles. Pure functions: the CSS that draws it is in styles/home.css (.art).

export const COVER_STYLES = 8;

export type CoverSpec = { style: number; seed: number; vars: Record<string, string> };

/** FNV-1a: small, stable, good enough to spread slugs over styles and jitter. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random in [0,1) from a seed and a slot, so jitter values are independent of each other. */
const rnd = (seed: number, slot: number) => (hash(`${seed}:${slot}`) % 10000) / 10000;
const between = (seed: number, slot: number, lo: number, hi: number) => lo + rnd(seed, slot) * (hi - lo);

export function coverSpec(slug: string, opts: { style?: number; seed?: number } = {}): CoverSpec {
  const seed = opts.seed ?? hash(slug) % 1_000_000;
  const style = opts.style !== undefined && opts.style >= 0 && opts.style < COVER_STYLES ? opts.style : hash(`${slug}#${seed}`) % COVER_STYLES;
  const f = (n: number, unit: string) => `${n.toFixed(2)}${unit}`;
  return {
    style,
    seed,
    vars: {
      '--cv-rot': f(between(seed, 1, -9, 9), 'deg'),
      '--cv-dx': f(between(seed, 2, 0.7, 1.35), ''),
      '--cv-dy': f(between(seed, 3, 0.7, 1.35), ''),
      '--cv-glow': f(between(seed, 4, 0.12, 0.26), ''),
      '--cv-gx': f(between(seed, 5, 10, 90), '%'),
      '--cv-line': f(between(seed, 6, 12, 24), '%'),
    },
  };
}
