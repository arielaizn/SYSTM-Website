import Image from 'next/image';
import { rv } from '../../lib/reveal';
import { Btn } from '../ui/Btn';
import { HeroCallouts } from './HeroCallouts';

export function Hero() {
  return (
    <section className="hero" data-stage="hero" aria-labelledby="hero-title">
      {/* Static brand render. Only shown when WebGL is unavailable (html[data-gl='off']). */}
      <div className="hero__poster" aria-hidden="true">
        <Image src="/img/glass-systems-hero.webp" alt="" width={1672} height={941} priority sizes="100vw" />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow" {...rv(0)}>
            <span className="dot" />
            <bdi>SYSTM</bdi> / מערכות חכמות לעבודה אמיתית
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="line" {...rv(1)}>
              פחות עומס.
            </span>
            <span className="line" {...rv(2)}>
              <em>יותר עסק.</em>
            </span>
          </h1>
          <p className="lead hero__lead" {...rv(3)}>
            סוכני AI ואוטומציות שמחברים בין <br className="br-desktop" />
            הכלים, האנשים והעבודה שלך.
          </p>
          <div className="hero__actions">
            <Btn href="/contact/" delay={240}>
              בואו נמצא את התהליך הבא
            </Btn>
            <Btn href="/services/" variant="glass" delay={300}>
              לגלות מה אפשר לבנות
            </Btn>
          </div>
          <p className="hero__caption" {...rv(6)}>
            <span className="dot" /> מתכננים. מחברים. מטמיעים.
          </p>
        </div>
      </div>

      <HeroCallouts />

      <a className="hero__scroll" href="#approach" {...rv(7)}>
        <span>SCROLL TO EXPLORE</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
