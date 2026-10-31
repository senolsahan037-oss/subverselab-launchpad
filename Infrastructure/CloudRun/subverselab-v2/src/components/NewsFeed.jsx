import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { liveNews } from '../data/news';
import PackShelf from './PackShelf';
import { useCatalog, mergeNews } from '../catalog/catalog';

// The homepage is our news (owner 2026-10-26: "subverselab yazısına bağlarız ve anasayfa olur, haberleri okumak için aşağı
// doğru kaydırırız"). One frame per news item, stacked; you read them by scrolling down. Each frame's panel window slides in
// from its side the first time it comes into view (IntersectionObserver); with prefers-reduced-motion it is simply there.
function NewsItem({ n, flip, first }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(first);

  useEffect(() => {
    if (seen) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <article ref={ref} className={`news-frame svl-divider-bottom${flip ? ' is-flipped' : ''}${seen ? ' is-seen' : ''}`}>
      <div className="news-copy">
        <p className="news-kicker">{n.kicker}</p>
        {n.date && <p className="news-date">{n.date}</p>}
        <h2 className="news-title">{n.title}</h2>
        <p className="news-line">{n.line}</p>
        {n.to && <Link to={n.to} className="btn btn-primary news-cta">{n.cta} →</Link>}
      </div>
      <div className={`news-window${n.bare ? ' is-bare' : ''}${n.bare === 'flat' ? ' is-flat' : ''}`}>
        <img src={n.image} alt={n.alt} loading={first ? 'eager' : 'lazy'} decoding="async" />
      </div>
    </article>
  );
}

export default function NewsFeed() {
  // The static frames (src/data/news.js) with the live catalogue laid over them (items added or edited from /admin).
  const cat = useCatalog();
  const items = useMemo(() => mergeNews(liveNews(), cat.news), [cat]);
  const feedRef = useRef(null);
  if (!items.length) return null;
  return (
    <section ref={feedRef} className="news-feed" aria-label="SubverseLab news">
      <PackShelf feedRef={feedRef} />
      <h1 className="news-feed-head">SubverseLab news</h1>
      {items.map((n, i) => <NewsItem key={n.key} n={n} flip={i % 2 === 1} first={i === 0} />)}
    </section>
  );
}
