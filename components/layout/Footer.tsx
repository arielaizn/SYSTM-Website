import { WORDMARK_PATHS, WORDMARK_VIEWBOX } from '../brand/logo-data';
import { Wordmark } from '../brand/Logo';
import { getContent } from '../../lib/content-source';
import { waLinkFor } from '../../lib/config';
import { SmartLink } from '../ui/SmartLink';

const year = new Date().getFullYear();

export async function Footer() {
  const { services, articles, settings } = await getContent();
  return (
    <footer className="footer" data-stage="footer">
      <div className="container">
        <div className="footer__card lg lg--dense">
          <div className="footer__top">
            <SmartLink href="/" aria-label="SYSTM, דף הבית">
              <Wordmark />
            </SmartLink>
            <p className="footer__tag">
              מערכות חכמות.
              <br />
              עבודה שמתקדמת.
            </p>
          </div>

          <div className="footer__cols">
            <div>
              <h2>פתרונות</h2>
              {services.map((s) => (
                <SmartLink key={s.slug} href={`/services/${s.slug}/`}>
                  {s.label}
                </SmartLink>
              ))}
            </div>
            <div>
              <h2>מדריכים</h2>
              {articles.map((a) => (
                <SmartLink key={a.slug} href={`/knowledge/${a.slug}/`}>
                  {a.title}
                </SmartLink>
              ))}
            </div>
            <div>
              <h2>ממשיכים מכאן</h2>
              <SmartLink href="/process/">איך עובדים</SmartLink>
              <SmartLink href="/workshops/">סדנאות</SmartLink>
              <SmartLink href="/knowledge/">ידע מעשי</SmartLink>
              <SmartLink href="/about/">אודות</SmartLink>
              <SmartLink href="/contact/">יצירת קשר</SmartLink>
            </div>
            <div>
              <h2>נדבר?</h2>
              <a href={waLinkFor(settings.whatsapp)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              <a href={`tel:${settings.phone}`} className="ltr">
                {settings.phoneDisplay}
              </a>
              {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
              {settings.socials.map((so) => (
                <a key={so.href} href={so.href} target="_blank" rel="noopener noreferrer">
                  {so.label}
                </a>
              ))}
            </div>
          </div>

          <div className="footer__bottom">
            <span>© {year} SYSTM</span>
            <nav aria-label="מידע">
              <SmartLink href="/privacy/">פרטיות</SmartLink>
              <SmartLink href="/accessibility/">נגישות</SmartLink>
            </nav>
            <span className="ltr">LESS FRICTION. MORE FLOW.</span>
          </div>
        </div>
      </div>

      <div className="footer__mark container" aria-hidden="true">
        <svg viewBox={WORDMARK_VIEWBOX} preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="footer-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f5f7f7" stopOpacity="0.92" />
              <stop offset="1" stopColor="#acf4f8" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <g fill="url(#footer-grad)">
            {WORDMARK_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      </div>
    </footer>
  );
}
