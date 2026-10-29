const WORDS = ['AI AGENTS', 'AUTOMATION', 'IMPLEMENTATION', 'WORKSHOPS'];

const Group = () => (
  <div className="marquee__group">
    {Array.from({ length: 3 }).flatMap((_, k) =>
      WORDS.map((w) => (
        <span key={`${k}-${w}`} className="marquee__item">
          {w}
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 0l1.4 4.6L12 6 7.4 7.4 6 12 4.6 7.4 0 6l4.6-1.4z" />
          </svg>
        </span>
      )),
    )}
  </div>
);

/** A thin glass strip of the four practice areas. Decorative, so hidden from assistive tech. */
export function Rail() {
  return (
    <div className="rail lg lg--dense lg--pill container" aria-hidden="true">
      <div className="marquee">
        <div className="marquee__track">
          <Group />
          <Group />
        </div>
      </div>
    </div>
  );
}
