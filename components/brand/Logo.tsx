import { MONOGRAM_PATH, WORDMARK_PATHS, WORDMARK_VIEWBOX } from './logo-data';

/** The official outline wordmark. Never retype SYSTM in a font (docs/03). */
export function Wordmark({ className, title = 'SYSTM' }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox={WORDMARK_VIEWBOX} role="img" aria-label={title} focusable="false">
      {WORDMARK_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function Monogram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 295 58" aria-hidden="true" focusable="false">
      <path d={MONOGRAM_PATH} />
    </svg>
  );
}
