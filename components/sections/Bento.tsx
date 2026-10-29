import type { CSSProperties } from 'react';
import { getContent } from '../../lib/content-source';
import { ServiceDiagram } from '../diagrams/Diagrams';
import { ArrowUpLeft } from '../ui/Icons';
import { SmartLink } from '../ui/SmartLink';

/** The five practice areas as liquid-glass tiles, each with its own living diagram. */
export async function Bento() {
  const { services } = await getContent();
  return (
    <div className="bento">
      {services.map((s, i) => (
        <SmartLink
          key={s.slug}
          href={`/services/${s.slug}/`}
          className={`bento__card bento__card--${s.diagram} lg lg--dense`}
          data-reveal=""
          style={{ '--d': `${i * 70}ms` } as CSSProperties}
        >
          <div className="bento__art">
            <ServiceDiagram slug={s.diagram} />
          </div>
          <div className="bento__body">
            <span className="bento__num">{s.number}</span>
            <h3 className="h-md">{s.label}</h3>
            <p>{s.short}</p>
            <span className="bento__more">
              לגלות את הפתרון <ArrowUpLeft />
            </span>
          </div>
        </SmartLink>
      ))}
    </div>
  );
}
