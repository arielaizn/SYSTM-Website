import type { CSSProperties } from 'react';
import type { ServiceSlug } from '../../lib/content';

// Five small living diagrams, one per service. Pure SVG + CSS: pulses travel along paths with offset-path,
// bars and code lines scale in sequence. Everything pauses until the card is revealed (.is-visible) and is
// removed under motion-off (see home.css). They are decoration, so they stay hidden from assistive tech.

const pulse = (path: string, t = 3.2, delay = 0): CSSProperties =>
  ({ offsetPath: `path('${path}')`, '--t': `${t}s`, animationDelay: `${delay}s` }) as CSSProperties;

const seq = (i: number, base = 0.25): CSSProperties => ({ animationDelay: `${i * base}s` });

function Agents() {
  return (
    <svg className="dg" viewBox="0 0 320 200" aria-hidden="true">
      <circle className="dg-ring" cx="160" cy="100" r="76" />
      <g className="dg-link">
        <path d="M160 100 L68 52" />
        <path d="M160 100 L252 52" />
        <path d="M160 100 L160 168" />
      </g>
      {[
        [42, 34],
        [226, 34],
        [134, 150],
      ].map(([x, y], i) => (
        <g key={i} className="dg-node">
          <rect x={x} y={y} width="52" height="32" rx="10" />
          <path d={`M${x + 12} ${y + 12}h28M${x + 12} ${y + 20}h16`} />
        </g>
      ))}
      <rect className="dg-core" x="128" y="68" width="64" height="64" rx="20" />
      <circle className="dg-eye" cx="148" cy="94" r="4" />
      <circle className="dg-eye" cx="172" cy="94" r="4" />
      <path className="dg-mouth" d="M147 112h26" />
      <g className="dg-gate">
        <circle cx="160" cy="26" r="12" />
        <path d="m154.5 26 4 4 7-8" />
      </g>
      <circle className="dg-pulse" r="3.5" style={pulse('M160 100 L68 52', 3.4)} />
      <circle className="dg-pulse" r="3.5" style={pulse('M160 100 L252 52', 3.4, 1.1)} />
      <circle className="dg-pulse" r="3.5" style={pulse('M160 168 L160 100', 3.4, 2.2)} />
    </svg>
  );
}

function Automation() {
  const xs = [14, 90, 166, 242];
  return (
    <svg className="dg" viewBox="0 0 320 200" aria-hidden="true">
      <path className="dg-link" d="M64 90H266" />
      {xs.map((x, i) => (
        <g key={x} className="dg-node">
          <rect x={x} y="68" width="64" height="44" rx="14" />
          <path d={`M${x + 16} 84h32M${x + 16} 96h${i % 2 ? 14 : 22}`} />
        </g>
      ))}
      <path className="dg-link dg-link--dash" d="M198 112V150" />
      <g className="dg-alert">
        <path d="M198 152l14 24h-28z" />
        <path d="M198 160v9M198 173v.1" />
      </g>
      <circle className="dg-pulse" r="3.5" style={pulse('M14 90H302', 4.2)} />
      <circle className="dg-pulse" r="3.5" style={pulse('M14 90H302', 4.2, 2.1)} />
    </svg>
  );
}

function Consulting() {
  const dots: [number, number][] = [
    [88, 130],
    [124, 70],
    [158, 112],
    [196, 148],
    [232, 56],
  ];
  return (
    <svg className="dg" viewBox="0 0 320 200" aria-hidden="true">
      <rect className="dg-frame" x="44" y="18" width="232" height="152" rx="18" />
      <path className="dg-link" d="M160 18V170M44 94H276" />
      {dots.map(([x, y], i) => (
        <circle key={i} className={i === 4 ? 'dg-dot dg-dot--hot' : 'dg-dot'} cx={x} cy={y} r={i === 4 ? 6 : 4.5} />
      ))}
      <circle className="dg-ping" cx="232" cy="56" r="6" />
      <circle className="dg-ping dg-ping--2" cx="232" cy="56" r="6" />
      <path className="dg-link dg-link--dash" d="M232 56 L276 30" />
    </svg>
  );
}

function Workshops() {
  const arc: [number, number][] = [
    [58, 150],
    [108, 168],
    [160, 174],
    [212, 168],
    [262, 150],
  ];
  const off = [28, 12, 34, 4];
  return (
    <svg className="dg" viewBox="0 0 320 200" aria-hidden="true">
      <rect className="dg-frame" x="86" y="20" width="148" height="92" rx="14" />
      {off.map((o, i) => (
        <rect key={i} className="dg-bar" x={108 + i * 30} y={44 + o} width="16" height={52 - o} rx="4" style={{ ...seq(i, 0.3), transformOrigin: `${116 + i * 30}px 96px` }} />
      ))}
      {arc.map(([x, y], i) => (
        <g key={i} className="dg-person" style={seq(i, 0.18)}>
          <circle cx={x} cy={y - 8} r="6" />
          <path d={`M${x - 11} ${y + 12}a11 11 0 0 1 22 0`} />
        </g>
      ))}
    </svg>
  );
}

function ClaudeCode() {
  const lines: [number, number, number][] = [
    [66, 70, 120],
    [82, 92, 150],
    [82, 114, 96],
    [66, 136, 134],
  ];
  return (
    <svg className="dg" viewBox="0 0 320 200" aria-hidden="true">
      <rect className="dg-frame" x="30" y="20" width="260" height="156" rx="16" />
      <path className="dg-link" d="M30 56H290" />
      {[50, 66, 82].map((x) => (
        <circle key={x} className="dg-eye" cx={x} cy="38" r="3.5" />
      ))}
      {lines.map(([x, y, w], i) => (
        <rect key={i} className={i % 2 ? 'dg-code dg-code--soft' : 'dg-code'} x={x} y={y} width={w} height="9" rx="4.5" style={{ ...seq(i, 0.55), transformOrigin: `${x}px ${y}px` }} />
      ))}
      <rect className="dg-cursor" x="206" y="134" width="8" height="13" rx="2" />
    </svg>
  );
}

const map: Record<ServiceSlug, () => React.JSX.Element> = {
  'ai-agents': Agents,
  automation: Automation,
  consulting: Consulting,
  workshops: Workshops,
  'claude-code': ClaudeCode,
};

export function ServiceDiagram({ slug }: { slug: ServiceSlug }) {
  const D = map[slug];
  return <D />;
}
