import type { CSSProperties } from 'react';
import type { Article } from '../../lib/content';
import { getContent } from '../../lib/content-source';
import { ArrowUpLeft } from '../ui/Icons';
import { ArticleArt } from './ArticleArt';
import { SmartLink } from '../ui/SmartLink';

export function ArticleCard({ a, i }: { a: Article; i: number }) {
  return (
    <SmartLink href={`/knowledge/${a.slug}/`} className="acard lg lg--dense" data-reveal="" style={{ '--d': `${i * 70}ms` } as CSSProperties} data-title={a.title + ' ' + a.summary + ' ' + a.category}>
      <ArticleArt a={a} i={i} />
      <div className="acard__body">
        <p className="acard__meta">
          <span>{a.category}</span>
          <span className="muted">{a.read}</span>
        </p>
        <h3>{a.title}</h3>
        <p className="muted">{a.summary}</p>
        <span className="bento__more">
          לקריאת המדריך <ArrowUpLeft />
        </span>
      </div>
    </SmartLink>
  );
}

export async function Guides() {
  const { articles } = await getContent();
  return (
    <div className="agrid">
      {articles.map((a, i) => (
        <ArticleCard key={a.slug} a={a} i={i} />
      ))}
    </div>
  );
}

export { ArticleArt };
