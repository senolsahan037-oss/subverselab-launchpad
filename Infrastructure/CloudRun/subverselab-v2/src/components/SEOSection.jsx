import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSEOArticles } from '../services/seoService';
import { GENERAL_FAQ } from '../data/faqContent';


/* ────────────────────────────────────────────────────────────
   FAQ Accordion Item
   ──────────────────────────────────────────────────────────── */
// Guide bodies are markdown and open with a "## Overview" heading, so slicing
// the raw string put a literal "## Overview" at the front of every card
// excerpt. This takes the first real paragraph and strips the syntax — the
// same treatment scripts/prerender.js applies to meta descriptions, so the
// card, the search snippet and llms.txt all read the same way.
function excerpt(md = '', limit = 120) {
  const prose = String(md)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .find((b) => b && !b.startsWith('#') && !b.startsWith('|') && !/^-{3,}$/.test(b))
    || String(md);
  const text = prose
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 40 ? cut.slice(0, lastSpace) : cut}…`;
}

function FAQItem({ faq, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{
      borderBottom: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '20px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '16px',
        }}
        aria-expanded={open}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)', margin: 0 }}>
          {faq.question}
        </h3>
        <span style={{
          fontSize: '1.2rem', color: 'var(--color-primary)', flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.35s ease',
      }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.7', paddingBottom: '20px' }}>
          {faq.answer}
          {faq.slug && (
            <Link
              to={`/learn/${faq.slug}`}
              style={{ marginLeft: '10px', color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.85rem' }}
            >
              Read full guide →
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Blog Card
   ──────────────────────────────────────────────────────────── */
function BlogCard({ article }) {
  return (
    <Link to={`/learn/${article.slug}`} style={{ textDecoration: 'none' }}>
      <article style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        height: '100%',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}>
        <div style={{
          fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase',
          letterSpacing: '1px', color: 'var(--color-accent)',
          background: 'rgba(42,157,143,0.1)', padding: '4px 10px',
          borderRadius: '999px', alignSelf: 'flex-start',
          border: '1px solid rgba(42,157,143,0.3)',
        }}>
          {article.category}
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: '1.4' }}>
          {article.title}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.6', flex: 1 }}>
          {excerpt(article.body || article.answer)}
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600' }}>
          Read guide →
        </div>
      </article>
    </Link>
  );
}

// Every seo_article on the site is type "blog" (the per-tool guides), so the
// `type: 'faq'` query below has always come back empty — and this fallback
// used to be an empty array, which meant the homepage FAQ block silently
// rendered nothing at all. It now falls back to the same FAQ content the
// /help page and the prerenderer use, so there is one source of truth and
// the homepage can never end up with an invisible section again.
const DEFAULT_FAQS = GENERAL_FAQ.map((item, i) => ({
  id: `general-${i}`,
  question: item.q,
  answer: item.a,
}));

const DEFAULT_BLOGS = [];

/* ────────────────────────────────────────────────────────────
   Main SEO Section
   ──────────────────────────────────────────────────────────── */
export default function SEOSection() {
  const [faqs, setFaqs] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const schemaInjected = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const [faqData, blogData] = await Promise.all([
          getSEOArticles({ status: 'published', type: 'faq' }),
          getSEOArticles({ status: 'published', type: 'blog' }),
        ]);
        setFaqs((faqData && faqData.length > 0) ? faqData.slice(0, 8) : DEFAULT_FAQS);
        setBlogs((blogData && blogData.length > 0) ? blogData.slice(0, 6) : DEFAULT_BLOGS);
      } catch (err) {
        console.warn('[SEOSection] Using default articles fallback:', err.message);
        setFaqs(DEFAULT_FAQS);
        setBlogs(DEFAULT_BLOGS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);



  // Don't render anything if loading or no content
  if (loading || (faqs.length === 0 && blogs.length === 0)) return null;

  return (
    <section style={{ borderTop: '1px solid var(--color-border)', marginTop: '40px' }}>
      <div className="container" style={{ padding: '80px 40px' }}>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <div style={{ marginBottom: '80px' }}>
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.25)',
                borderRadius: '999px', padding: '5px 14px', marginBottom: '16px',
                fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '1px', color: 'var(--color-primary)',
              }}>
                ◆ Frequently Asked Questions
              </div>
              <h2 style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: '800',
                color: 'var(--color-text)', margin: 0,
              }}>
                Everything You Need to Know
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '12px', fontSize: '0.95rem' }}>
                Common questions about SubverseLab's free AI tools for music producers.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))',
              gap: '0 60px',
            }}>
              {/* Split FAQs into two columns */}
              {[faqs.slice(0, Math.ceil(faqs.length / 2)), faqs.slice(Math.ceil(faqs.length / 2))].map((col, ci) => (
                <div key={ci}>
                  {col.map((faq, i) => (
                    <FAQItem key={faq.id} faq={faq} index={ci === 0 && i === 0 ? 0 : 1} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blog / Learn Section */}
        {blogs.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.25)',
                  borderRadius: '999px', padding: '5px 14px', marginBottom: '14px',
                  fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '1px', color: 'var(--color-accent)',
                }}>
                  ◆ Learn
                </div>
                <h2 style={{
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: '800',
                  color: 'var(--color-text)', margin: 0,
                }}>
                  AI Music Production Guides
                </h2>
              </div>
              <Link to="/learn" style={{
                color: 'var(--color-primary)', fontWeight: '600',
                fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                View all guides →
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
              gap: '20px',
            }}>
              {blogs.map(blog => (
                <BlogCard key={blog.id} article={blog} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
