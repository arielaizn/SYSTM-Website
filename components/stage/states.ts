// The 3D stage is one object (three glass slabs joined by a cyan filament: the SYSTM mark made physical).
// Sections declare which pose they want with data-stage="name"; the engine blends the poses of every section
// near the viewport centre. Positions are in normalised device coordinates so they hold at any aspect ratio.

export type StageState = {
  x: number; // -1 (left) .. 1 (right)
  y: number; // -1 (bottom) .. 1 (top)
  size: number; // 1 = about 40% of the viewport height
  yaw: number;
  pitch: number;
  roll: number;
  explode: number; // 0 = stacked S, 1 = slabs drifted apart
  gap: number; // vertical spacing multiplier
  glow: number; // filament brightness
  filament: number; // 0..1 how much of the filament is lit
  dim: number; // 0..1 overall exposure
};

export const STATE_KEYS = ['x', 'y', 'size', 'yaw', 'pitch', 'roll', 'explode', 'gap', 'glow', 'filament', 'dim'] as const;

const s = (o: Partial<StageState>): StageState => ({
  x: 0, y: 0, size: 1, yaw: 0, pitch: 0.25, roll: 0, explode: 0, gap: 1, glow: 1, filament: 1, dim: 1, ...o,
});

export const STAGES: Record<string, StageState> = {
  hero: s({ x: -0.48, y: -0.02, size: 1.12, yaw: -0.55, pitch: 0.3, glow: 1 }),
  approach: s({ x: -0.6, y: 0.04, size: 1.0, yaw: -0.2, pitch: 0.24, explode: 0.5, gap: 1.3, glow: 0.8, dim: 0.62 }),
  solutions: s({ x: 0.02, y: 0.02, size: 2.15, yaw: 0.18, pitch: 0.5, explode: 0.9, gap: 1.6, glow: 0.7, dim: 0.34 }),
  demo: s({ x: 0.58, y: 0.1, size: 1.15, yaw: 0.55, pitch: 0.26, explode: 1, gap: 1.2, glow: 0.8, filament: 0.65, dim: 0.34 }),
  process: s({ x: -0.5, y: 0.0, size: 1.4, yaw: -0.9, pitch: 0.3, explode: 0.3, gap: 1.15, glow: 1.15, filament: 0, dim: 0.78 }),
  founder: s({ x: -0.5, y: 0.0, size: 1.25, yaw: 0.7, pitch: 0.2, explode: 0.3, glow: 0.6, dim: 0.42 }),
  guides: s({ x: -0.72, y: 0.5, size: 0.8, yaw: 0.3, pitch: 0.3, explode: 0.6, glow: 0.4, dim: 0.22 }),
  faq: s({ x: -0.62, y: 0.28, size: 0.95, yaw: -0.5, pitch: 0.3, explode: 0.4, glow: 0.4, dim: 0.2 }),
  cta: s({ x: -0.46, y: 0.02, size: 1.15, yaw: -0.08, pitch: 0.12, explode: 0, gap: 1.02, glow: 1.4, dim: 0.9 }),
  footer: s({ x: 0.55, y: 0.55, size: 0.7, yaw: 0.4, pitch: 0.3, explode: 0.5, glow: 0.3, dim: 0.14 }),
  quiet: s({ x: -0.6, y: 0.1, size: 0.92, yaw: -0.42, pitch: 0.3, explode: 0.15, glow: 0.6, dim: 0.42 }),
  reading: s({ x: -0.85, y: 0.35, size: 0.75, yaw: -0.5, pitch: 0.3, explode: 0.4, glow: 0.35, dim: 0.13 }),
  // Admin sign-in: the object waits beside the card and its filament is lit by the password length (see LoginScreen).
  login: s({ x: -0.46, y: 0.02, size: 1.18, yaw: -0.52, pitch: 0.28, explode: 0.18, gap: 1.05, glow: 1.05, filament: 0.08, dim: 0.88 }),
};

/** Narrow screens: the object sits low and small, behind the content instead of beside it. */
export function resolveState(name: string, mobile: boolean): StageState {
  const base = STAGES[name] ?? STAGES.quiet;
  if (!mobile) return base;
  if (name === 'login') return { ...base, x: 0, y: 0.5, size: base.size * 0.54, dim: 0.8 };
  const isHero = name === 'hero' || name === 'cta';
  return {
    ...base,
    x: name === 'cta' ? 0 : base.x * 0.25,
    y: isHero ? (name === 'hero' ? -0.66 : 0.35) : 0.8,
    size: base.size * (isHero ? (name === 'hero' ? 0.56 : 0.62) : 0.42),
    dim: name === 'cta' ? 0.32 : isHero ? base.dim * 0.9 : Math.min(base.dim, 0.26),
  };
}
