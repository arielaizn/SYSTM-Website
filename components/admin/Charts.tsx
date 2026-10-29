// Small SVG charts for the dashboard. Server-rendered, no dependencies. Each carries a text summary for screen readers.
export function DailyBars({ data }: { data: { day: string; n: number }[] }) {
  const W = 640;
  const H = 180;
  const pad = { t: 10, r: 6, b: 24, l: 26 };
  const max = Math.max(4, ...data.map((d) => d.n));
  const ticks = [0, Math.round(max / 2), max];
  const bw = (W - pad.l - pad.r) / data.length;
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`פניות חדשות ב־30 הימים האחרונים: ${total} בסך הכול`}>
      {ticks.map((t) => {
        const y = pad.t + (H - pad.t - pad.b) * (1 - t / max);
        return (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={W - pad.r} y1={y} y2={y} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end">
              {t}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (H - pad.t - pad.b) * (d.n / max);
        const x = W - pad.r - (i + 1) * bw + 2;
        return (
          <g key={d.day}>
            <rect className={d.n ? 'bar' : 'bar--zero'} x={x} y={d.n ? H - pad.b - h : H - pad.b - 2} width={Math.max(2, bw - 4)} height={d.n ? h : 2} rx="3">
              <title>{`${d.day}: ${d.n}`}</title>
            </rect>
            {i % 6 === 0 ? (
              <text x={x + bw / 2 - 2} y={H - 6} textAnchor="middle">
                {d.day.slice(5).replace('-', '/')}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function HBars({ rows }: { rows: { label: string; n: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="ad-hbar">
      {rows.map((r) => (
        <div className="ad-hbar__row" key={r.label}>
          <span>{r.label}</span>
          <i>
            <b style={{ width: `${(r.n / max) * 100}%`, ['--c' as string]: r.color }} />
          </i>
          <span>{r.n}</span>
        </div>
      ))}
    </div>
  );
}
