import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getSEOArticleBySlug, getSEOArticles } from '../services/seoService';
import { toMetaDescription } from '../data/siteMeta';
import mixCheckGuide from '../data/mix-check-guide.md?raw';

/* Simple markdown-like renderer for body text */
function ArticleBody({ body }) {
  if (!body) return null;

  const lines = body.split('\n');
  const elements = [];
  let key = 0;
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length > 1) {
      const headers = tableRows[0].split('|').filter(Boolean).map(h => h.trim());
      elements.push(
        <div key={`table-${key++}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>{headers.map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-primary)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {tableRows.slice(2).map((row, ri) => {
                const cells = row.split('|').filter(Boolean).map(c => c.trim());
                return (
                  <tr key={ri} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {cells.map((c, ci) => <td key={ci} style={{ padding: '10px 14px', color: 'var(--color-text)' }}>{c}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    tableRows = [];
    inTable = false;
  };

  for (const line of lines) {
    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line);
      continue;
    }
    if (inTable) flushTable();

    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-text)', margin: '36px 0 16px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-primary)', margin: '24px 0 12px' }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '32px 0' }} />);
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={key++} style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '8px', paddingLeft: '4px' }}>
          {line.replace(/^\d+\. /, '')}
        </li>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} style={{ fontWeight: '700', color: 'var(--color-text)', margin: '16px 0 8px' }}>{line.replace(/\*\*/g, '')}</p>);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
    } else {
      // Inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} style={{ color: 'var(--color-text-muted)', lineHeight: '1.8', margin: '8px 0' }}>
          {parts.map((p, i) => i % 2 === 0 ? p : <strong key={i} style={{ color: 'var(--color-text)', fontWeight: '700' }}>{p}</strong>)}
        </p>
      );
    }
  }

  if (inTable) flushTable();
  return <div>{elements}</div>;
}

/* ────────────────────────────────────────────────────────────
   Article Page
   ──────────────────────────────────────────────────────────── */
export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const schemaRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        let art = await getSEOArticleBySlug(slug).catch(() => null);
        
        if (!art) {
          setNotFound(true);
          return;
        }

        if (slug === 'subverse-mix-check') {
          art = { ...art, body: mixCheckGuide, answer: 'Evidence-first audio measurement for your mix or master, with direct loudness, level, spectral, and mono fold-down evidence.' };
        }
        setArticle(art);

        const relatedArts = await getSEOArticles({ type: 'blog' }).catch(() => []);
        setRelated(relatedArts.filter(r => r.slug !== slug).slice(0, 3));
      } catch (err) {
        console.error('[ArticlePage] Error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);



  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }}>Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '16px' }}>Article Not Found</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>This guide doesn't exist or hasn't been published yet.</p>
        <Link to="/" className="btn btn-primary">Back to Tools</Link>
      </div>
    );
  }

  const metaDescription = article.metaDescription || toMetaDescription(article.body, article.answer);

  return (
    <>
      {/* SEO meta via react-helmet-async */}
      <Helmet>
        <title>{article.metaTitle || `${article.title} | SubverseLab`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://subverselab.com/learn/${article.slug}`} />
        <meta property="og:title" content={article.metaTitle || article.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://subverselab.com/learn/${article.slug}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={metaDescription} />
        {slug === 'subverse-mix-check' && <link rel="icon" type="image/svg+xml" href="/subverse-mix-check-mark.svg" />}
      </Helmet>

      <div style={{ paddingBottom: '100px' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(197,160,89,0.04) 0%, transparent 100%)',
          borderBottom: '1px solid var(--color-border)',
          padding: '60px 0 40px',
          marginBottom: '0',
        }}>
          <div className="container">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" style={{ marginBottom: '24px', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/" style={{ color: 'var(--color-text-muted)' }}>Home</Link>
              <span>›</span>
              <Link to="/learn" style={{ color: 'var(--color-text-muted)' }}>Learn</Link>
              <span>›</span>
              <span style={{ color: 'var(--color-text)' }}>{article.category}</span>
            </nav>

            {/* Category badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.3)',
              borderRadius: '999px', padding: '4px 12px', marginBottom: '20px',
              fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '1px', color: 'var(--color-accent)',
            }}>
              {article.type === 'faq' ? 'FAQ' : 'Guide'} · {article.category}
            </div>

            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: '900',
              color: 'var(--color-text)', lineHeight: '1.2', marginBottom: '20px', maxWidth: '800px',
            }}>
              {article.title}
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '640px', lineHeight: '1.7', marginBottom: '24px' }}>
              {article.answer}
            </p>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>
              <span>By SubverseLab</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-border)', display: 'inline-block' }}></span>
              <time>{article.updatedAt instanceof Date ? article.updatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</time>
              {article.keywords?.length > 0 && (
                <>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-border)', display: 'inline-block' }}></span>
                  <span>{article.keywords.slice(0, 3).join(' · ')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="container" style={{ paddingTop: '48px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr min(680px, 100%) 1fr' }}>
            <article style={{ gridColumn: '2' }}>
              <ArticleBody body={article.body} />

              {/* Back link */}
              <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid var(--color-border)' }}>
                <Link to="/" className="btn btn-outline" style={{ marginRight: '12px' }}>← Browse Tools</Link>
                <Link to="/learn" className="btn btn-ghost">More Guides</Link>
              </div>
            </article>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div style={{ marginTop: '80px', paddingTop: '48px', borderTop: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '24px' }}>Related Guides</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '20px' }}>
                {related.map(rel => (
                  <Link key={rel.id} to={`/learn/${rel.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', padding: '20px',
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{rel.category}</div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 8px', lineHeight: '1.4' }}>{rel.title}</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>{rel.answer?.slice(0, 80)}...</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
