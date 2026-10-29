'use client';

import { useMemo, useState } from 'react';
import { useContent } from '../layout/ContentContext';
import { Search } from '../ui/Icons';
import { ArticleCard } from './Guides';

/** Search over the guides. Filters in place and announces the result count to screen readers. */
export function KnowledgeList() {
  const { articles } = useContent();
  const [q, setQ] = useState('');
  const query = q.trim().toLocaleLowerCase('he');

  const visible = useMemo(
    () =>
      articles
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => !query || `${a.title} ${a.summary} ${a.category} ${a.sections.map((s) => s.join(' ')).join(' ')}`.toLocaleLowerCase('he').includes(query)),
    [query, articles],
  );

  const status = !query ? '' : visible.length === 0 ? 'לא נמצאו מדריכים מתאימים. נסו מילה אחרת.' : visible.length === 1 ? 'נמצא מדריך אחד' : `${visible.length} מדריכים נמצאו`;

  return (
    <>
      <div className="ksearch">
        <label className="ksearch__field lg lg--pill lg--dense">
          <Search />
          <span className="sr-only">חיפוש במדריכים</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="מה מעניין אותך? למשל: פיילוט" autoComplete="off" />
        </label>
        <p className="ksearch__status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
      <div className="agrid">
        {visible.map(({ a, i }) => (
          <ArticleCard key={a.slug} a={a} i={i} />
        ))}
      </div>
    </>
  );
}
