import type { CSSProperties } from 'react';
import { rv } from '../../lib/reveal';
import { ScrollVar } from '../ui/ScrollVar';
import { SmartLink } from '../ui/SmartLink';
import { ArrowUpLeft } from '../ui/Icons';

const FIRST = 'העסק שלך לא צריך עוד כלי.';
const SECOND = 'הוא צריך שהדברים יתחברו.';

const words = [...FIRST.split(' ').map((w) => ({ w, em: false })), ...SECOND.split(' ').map((w) => ({ w, em: true }))];

/**
 * The brand statement, lit word by word as the section scrolls past (a sticky pin, not scroll hijacking:
 * the page scrolls at its normal speed). Without JS or with motion off every word is fully visible.
 */
export function Approach() {
  return (
    <ScrollVar as="section" mode="pin" id="approach" className="approach" data-stage="approach" style={{ '--n': words.length } as CSSProperties}>
      <div className="approach__pin container">
        <p className="eyebrow" {...rv(0)}>
          <span className="dot" />
          <bdi>01</bdi> / הגישה שלנו
        </p>
        <h2 className="approach__text h-xl">
          <span className="sr-only">
            {FIRST} {SECOND}
          </span>
          <span aria-hidden="true">
            {words.map((x, i) => (
              <span key={i} className={`w${x.em ? ' w--em' : ''}`} style={{ '--i': i } as CSSProperties}>
                {x.w}{' '}
              </span>
            ))}
          </span>
        </h2>
        <div className="approach__foot">
          <p className="muted" {...rv(1)}>
            הודעה כאן, גיליון שם, משימה שנשכחה באמצע. מתחילים מהחיבורים שמזיזים את העבודה קדימה.
          </p>
          <SmartLink href="/process/" className="text-link" {...rv(2)}>
            כך אנחנו עובדים <ArrowUpLeft />
          </SmartLink>
        </div>
      </div>
    </ScrollVar>
  );
}
