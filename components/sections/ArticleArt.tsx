import type { CSSProperties } from 'react';
import { coverSpec } from '../../lib/cover';
import type { Article } from '../../lib/content';

/** Generated cover art: three glass panes, a composition and jitter derived from the guide (lib/cover.ts). */
export function ArticleArt({ a, i }: { a: Pick<Article, 'slug' | 'coverStyle' | 'coverSeed'>; i: number }) {
  const spec = coverSpec(a.slug, { style: a.coverStyle, seed: a.coverSeed });
  return (
    <div className={`art art--${spec.style}`} style={spec.vars as CSSProperties} aria-hidden="true">
      <span className="art__pane" />
      <span className="art__pane" />
      <span className="art__pane" />
      <i className="art__line" />
      <bdi className="art__tag">{`${String((i % 99) + 1).padStart(2, '0')} / SYSTM`}</bdi>
    </div>
  );
}
