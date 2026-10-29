import type { CSSProperties, ReactNode } from 'react';
import { waLinkFor } from '../../lib/config';
import { getContent } from '../../lib/content-source';
import { rv } from '../../lib/reveal';
import { Btn } from '../ui/Btn';
import { Plus, WhatsApp } from '../ui/Icons';
import { SmartLink } from '../ui/SmartLink';

export function SectionHead({ n, label, title, intro }: { n: string; label: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <header className="sec-head">
      <p className="eyebrow" {...rv(0)}>
        <span className="dot" />
        <bdi>{n}</bdi> / {label}
      </p>
      <h2 className="h-lg" {...rv(1)}>
        {title}
      </h2>
      {intro ? (
        <p className="sec-head__intro" {...rv(2)}>
          {intro}
        </p>
      ) : null}
    </header>
  );
}

/** Hero for every inner page. The stage holds the quiet pose behind it. */
export function PageHero({
  n,
  label,
  title,
  lead,
  actions,
  ghost,
  crumbs,
  stage = 'quiet',
}: {
  n: string;
  label: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  ghost?: string;
  crumbs?: { label: string; href?: string }[];
  stage?: string;
}) {
  return (
    <section className="page-hero container" data-stage={stage}>
      {crumbs ? (
        <nav className="crumbs" aria-label="נתיב" {...rv(0)}>
          {crumbs.map((c, i) => (
            <span key={c.label}>
              {c.href ? <SmartLink href={c.href}>{c.label}</SmartLink> : <span aria-current="page">{c.label}</span>}
              {i < crumbs.length - 1 ? <i aria-hidden="true">/</i> : null}
            </span>
          ))}
        </nav>
      ) : null}
      {ghost ? (
        <span className="page-hero__ghost" aria-hidden="true">
          {ghost}
        </span>
      ) : null}
      <p className="eyebrow" {...rv(0)}>
        <span className="dot" />
        <bdi>{n}</bdi> / {label}
      </p>
      <h1 className="h-xl page-hero__title" {...rv(1)}>
        {title}
      </h1>
      {lead ? (
        <p className="lead" {...rv(2)}>
          {lead}
        </p>
      ) : null}
      {actions ? <div className="page-hero__actions">{actions}</div> : null}
    </section>
  );
}

export async function Cta({
  title = (
    <>
      מה תקוע
      <br />
      <em>בעסק שלך?</em>
    </>
  ),
  text = 'ספרו לנו, ונבחר יחד את הצעד הראשון.',
}: {
  title?: ReactNode;
  text?: ReactNode;
}) {
  const { settings } = await getContent();
  return (
    <section className="cta container" data-stage="cta">
      <p className="eyebrow" {...rv(0)}>
        <span className="dot" />
        <bdi>NEXT</bdi> / מתחילים בתהליך אחד
      </p>
      <h2 className="cta__title" {...rv(1)}>
        {title}
      </h2>
      <p className="cta__text" {...rv(2)}>
        {text}
      </p>
      <div className="cta__row">
        <Btn href="/contact/" delay={180}>
          בואו נדבר
        </Btn>
        <Btn href={waLinkFor(settings.whatsapp)} external variant="glass" icon={<WhatsApp />} delay={240}>
          וואטסאפ ישיר
        </Btn>
      </div>
    </section>
  );
}

export function Faq({ items, stage }: { items: readonly (readonly [string, string])[]; stage?: boolean }) {
  return (
    <div className="faq" {...(stage ? { 'data-stage': 'faq' } : {})}>
      {items.map(([q, a], i) => (
        <details key={q} className="faq__item lg lg--dense" data-reveal="" style={{ '--d': `${Math.min(i, 5) * 50}ms` } as CSSProperties}>
          <summary>
            <span>{q}</span>
            <Plus />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
