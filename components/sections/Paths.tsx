import type { CSSProperties } from 'react';
import { ArrowUpLeft } from '../ui/Icons';
import { SmartLink } from '../ui/SmartLink';
import { SectionHead } from './Shared';

const paths = [
  { who: 'בעלי עסקים', q: 'יש לי עסק. איפה אפשר להוריד עבודה ידנית?', to: 'אוטומציות לעסקים', href: '/services/automation/' },
  { who: 'מנהלים וצוותים', q: 'אני מנהל צוות. איך מיישמים את זה בסדר?', to: 'איך עובדים יחד', href: '/process/' },
  { who: 'ארגונים', q: 'אני אחראי על הדרכה. איזה מפגש מתאים לצוות?', to: 'הרצאות וסדנאות', href: '/services/workshops/' },
  { who: 'יוצרים ועורכי וידאו', q: 'אני יוצר. איך משלבים כלי AI בעבודה?', to: 'קלוד קוד ליוצרים', href: '/services/claude-code/' },
  { who: 'בתחילת הדרך', q: 'אני רק מתחיל להבין. מה כדאי לעשות קודם?', to: 'ידע מעשי', href: '/knowledge/' },
];

/** The five audiences from the brief, each with a direct way into the site. Turns the home page into a hub. */
export function Paths() {
  return (
    <section className="section container" data-stage="guides" aria-labelledby="paths-title">
      <SectionHead
        n="PATHS"
        label="מאיפה מתחילים"
        title={
          <span id="paths-title">
            איפה אתם נמצאים?
            <br />
            <em>משם מתחילים.</em>
          </span>
        }
        intro="חמש דרכים להיכנס לאתר, לפי השאלה שמביאה אתכם."
      />
      <ul className="paths">
        {paths.map((p, i) => (
          <li key={p.href} data-reveal="" style={{ '--d': `${i * 55}ms` } as CSSProperties}>
            <SmartLink href={p.href} className="paths__row lg lg--dense">
              <span className="paths__who">{p.who}</span>
              <span className="paths__q">{p.q}</span>
              <span className="paths__to">
                {p.to}
                <ArrowUpLeft />
              </span>
            </SmartLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
