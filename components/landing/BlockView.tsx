import type { CSSProperties } from 'react';
import { youtubeId, type AnyBlock } from '../../lib/landing';
import { LandingForm } from './LandingForm';

const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className: string }) => (
  <a className={className} href={href} {...(/^https:\/\//.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
    <span>{children}</span>
  </a>
);

function Inner({ b, slug, preview }: { b: AnyBlock; slug: string; preview?: boolean }) {
  switch (b.type) {
    case 'hero': {
      const p = b.props;
      return (
        <div className="lp-hero">
          <div className="lp-hero__copy">
            {p.eyebrow ? <p className="lp-eyebrow">{p.eyebrow}</p> : null}
            <h1>{p.title}</h1>
            {p.subtitle ? <p className="lp-lead">{p.subtitle}</p> : null}
            <div className="lp-actions">
              {p.ctaLabel && p.ctaHref ? <Link className="btn btn--ice" href={p.ctaHref}>{p.ctaLabel}</Link> : null}
              {p.secondaryLabel && p.secondaryHref ? <Link className="btn btn--glass lg lg--pill" href={p.secondaryHref}>{p.secondaryLabel}</Link> : null}
            </div>
          </div>
          {p.image ? <img className="lp-hero__img" src={p.image} alt="" loading="eager" /> : null}
        </div>
      );
    }
    case 'text':
      return <div className="prose" dangerouslySetInnerHTML={{ __html: b.props.html }} />;
    case 'features':
      return (
        <>
          {b.props.title ? <h2 className="lp-h2">{b.props.title}</h2> : null}
          {b.props.intro ? <p className="lp-lead">{b.props.intro}</p> : null}
          <div className="lp-grid" style={{ '--cols': b.props.columns } as CSSProperties}>
            {b.props.items.map((i, k) => (
              <div className="lp-card" key={k}>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </>
      );
    case 'steps':
      return (
        <>
          {b.props.title ? <h2 className="lp-h2">{b.props.title}</h2> : null}
          <ol className="lp-steps">
            {b.props.items.map((i, k) => (
              <li className="lp-card" key={k}>
                <span className="lp-num">{String(k + 1).padStart(2, '0')}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </li>
            ))}
          </ol>
        </>
      );
    case 'stats':
      return (
        <div className="lp-stats">
          {b.props.items.map((i, k) => (
            <div key={k}>
              <b>{i.value}</b>
              <span>{i.label}</span>
            </div>
          ))}
        </div>
      );
    case 'image':
      return b.props.src ? (
        <figure className="lp-figure">
          <img src={b.props.src} alt={b.props.alt} loading="lazy" />
          {b.props.caption ? <figcaption>{b.props.caption}</figcaption> : null}
        </figure>
      ) : (
        <p className="lp-empty">בחרו תמונה בלוח המאפיינים</p>
      );
    case 'video': {
      const id = youtubeId(b.props.url);
      return id ? (
        <figure className="lp-figure">
          <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={b.props.caption || 'סרטון'} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          {b.props.caption ? <figcaption>{b.props.caption}</figcaption> : null}
        </figure>
      ) : (
        <p className="lp-empty">הדביקו קישור יוטיוב בלוח המאפיינים</p>
      );
    }
    case 'testimonials':
      return (
        <>
          {b.props.title ? <h2 className="lp-h2">{b.props.title}</h2> : null}
          <div className="lp-grid" style={{ '--cols': Math.min(3, Math.max(1, b.props.items.length)) } as CSSProperties}>
            {b.props.items.filter((i) => i.quote).map((i, k) => (
              <blockquote className="lp-card" key={k}>
                <p>{i.quote}</p>
                <footer>
                  <b>{i.name}</b> {i.role ? <span>· {i.role}</span> : null}
                </footer>
              </blockquote>
            ))}
          </div>
        </>
      );
    case 'faq':
      return (
        <>
          {b.props.title ? <h2 className="lp-h2">{b.props.title}</h2> : null}
          <div className="lp-faq">
            {b.props.items.map((i, k) => (
              <details className="lp-card" key={k}>
                <summary>{i.q}</summary>
                <p>{i.a}</p>
              </details>
            ))}
          </div>
        </>
      );
    case 'cta':
      return (
        <div className="lp-cta">
          <h2 className="lp-h2">{b.props.title}</h2>
          {b.props.text ? <p className="lp-lead">{b.props.text}</p> : null}
          {b.props.label && b.props.href ? <Link className="btn btn--ice" href={b.props.href}>{b.props.label}</Link> : null}
        </div>
      );
    case 'form':
      return (
        <>
          <h2 className="lp-h2">{b.props.title}</h2>
          {b.props.text ? <p className="lp-lead">{b.props.text}</p> : null}
          <LandingForm slug={slug} service={b.props.service} button={b.props.button} preview={preview} />
        </>
      );
    case 'spacer':
      return <div style={{ height: b.props.height }} aria-hidden="true" />;
  }
}

/** One block, with its surface, spacing, alignment and visibility. Server-renderable; the admin preview uses the same component. */
export function BlockView({ block, slug, preview }: { block: AnyBlock; slug: string; preview?: boolean }) {
  const { style } = block;
  if (block.hidden && !preview) return null;
  return (
    <section
      id={style.anchor || undefined}
      className={`lp-block lp-pad--${style.padY} lp-surface--${style.surface}${style.surface === 'glass' ? ' lg' : ''} lp-hide--${style.hideOn || 'none'}${block.hidden ? ' lp-block--off' : ''}`}
      data-type={block.type}
      data-align={style.align}
    >
      <div className={`lp-inner lp-w--${style.width}`}>
        <Inner b={block} slug={slug} preview={preview} />
      </div>
    </section>
  );
}
