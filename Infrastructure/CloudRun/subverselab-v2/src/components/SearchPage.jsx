import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCatalog } from '../catalog/catalog';
import { searchSite, isPrivateQuery } from '../search/siteSearch';

// Every result for one query (owner 6 Nov 2026). The query comes from ?q=, or from the navbar box when it held something that
// must not go into a URL (a licence key, an e-mail address). Never indexed: the server sends noindex for /search.
export default function SearchPage({ searchQuery = '' }) {
  const [params] = useSearchParams();
  const q = params.get('q') ?? searchQuery;
  const cat = useCatalog();
  const result = useMemo(() => searchSite(q, cat, { perGroup: 24 }), [q, cat]);

  return (
    <div className="container search-page">
      <Helmet>
        <title>{q && !isPrivateQuery(q) ? `Search: ${q} | SubverseLab` : 'Search | SubverseLab'}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <h1>Search</h1>
      {!q.trim() ? (
        <p className="search-page-note">Type a plugin or pack name, a tool, or a question in the search box above.</p>
      ) : result.total === 0 ? (
        <p className="search-page-note">Nothing found for “{q}”. Try a product name, or read <Link to="/help">Help</Link>.</p>
      ) : (
        <>
          <p className="search-page-note">{result.total} {result.total === 1 ? 'result' : 'results'} for “{result.special === 'licence-key' ? 'your licence key' : q}”</p>
          {result.groups.map((g) => (
            <section key={g.id} className="search-page-group">
              <h2>{g.title}</h2>
              <ul>
                {g.items.map((it) => (
                  <li key={it.to + it.title} className={it.answer ? 'is-answer' : ''}>
                    <Link to={it.to} className="search-page-title">{it.title}</Link>
                    {it.answer ? <p className="search-page-answer">{it.answer}</p> : it.sub ? <p className="search-page-sub">{it.sub}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
