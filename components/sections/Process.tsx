import type { CSSProperties } from 'react';
import { processSteps } from '../../lib/content';
import { ScrollVar } from '../ui/ScrollVar';
import { SectionHead } from './Shared';

/** Four steps as glass slabs. The 3D filament behind them lights up as the section scrolls (data-stage-scrub). */
export function Process({ detailed = false, withHead = true }: { detailed?: boolean; withHead?: boolean }) {
  return (
    <ScrollVar as="section" mode="center" className="section process" data-stage="process" data-stage-scrub="filament,yaw">
      <div className="container process__grid">
        {withHead ? (
          <div className="process__intro">
            <SectionHead
              n="04"
              label="הדרך לעבודה חכמה"
              title={
                <>
                  מתחילים ברור.
                  <br />
                  <em>מתקדמים נכון.</em>
                </>
              }
            />
            <div className="process__rail" aria-hidden="true">
              <span />
            </div>
          </div>
        ) : null}
        <ol className="process__steps">
          {processSteps.map((s, i) => (
            <li key={s.n} className="pstep lg lg--dense" data-reveal="" style={{ '--d': `${i * 50}ms` } as CSSProperties}>
              <span className="pstep__n">{s.n}</span>
              <h3 className="pstep__verb">{s.verb}</h3>
              <p className="pstep__text">{s.text}</p>
              {detailed ? (
                <dl className="pstep__grid">
                  <div>
                    <dt>אתם</dt>
                    <dd>{s.you}</dd>
                  </div>
                  <div>
                    <dt>אנחנו</dt>
                    <dd>{s.we}</dd>
                  </div>
                  <div>
                    <dt>יוצא מזה</dt>
                    <dd>{s.out}</dd>
                  </div>
                </dl>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </ScrollVar>
  );
}
