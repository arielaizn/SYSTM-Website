import type { CSSProperties } from 'react';
import type { Article } from '../../lib/content';
import { getContent } from '../../lib/content-source';
import { ArrowUpLeft } from '../ui/Icons';
import { SmartLink } from '../ui/SmartLink';

/** Generative cover art: stacked glass panes in three compositions, one per guide. */
export function ArticleArt({ i }: { i: number }) {
  return (
    <div className={`art art--${i % 3}`} aria-hidden="true">
      <span className="art__pane" />
      <span className="art__pane" />
      <span className="art__pane" />
      <i className="art__line" />
      <bdi className="art__tag">{`0${(i % 9) + 1} / SYSTM`}</bdi>
    </div>
  );
}

export function ArticleCard({ a, i }: { a: Article; i: number }) {
  return (
    <SmartLink href={`/knowledge/${a.slug}/`} className="acard lg lg--dense" data-reveal="" style={{ '--d': `${i * 70}ms` } as CSSProperties} data-title={a.title + ' ' + a.summary + ' ' + a.category}>
      <ArticleArt i={i} />
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
