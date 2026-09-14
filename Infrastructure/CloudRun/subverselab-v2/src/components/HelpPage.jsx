import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GENERAL_FAQ, TOOL_FAQ, LOOM_FAQ, CONTACT_FAQ, ALL_FAQ } from '../data/faqContent';

// Plain <details>/<summary> rather than a JS-driven accordion — every
// answer stays in the DOM (just visually collapsed), so a crawler that
// never executes JS still sees the full text, and the FAQPage JSON-LD
// below actually matches what's really on the page.
function FaqSection({ title, items }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '16px' }}>{title}</h2>
      {items.map((item, i) => (
        <details key={i} style={{
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '10px',
          background: 'var(--color-surface-2, rgba(255,255,255,0.02))',
        }}>
          <summary style={{ fontWeight: '600', cursor: 'pointer' }}>{item.q}</summary>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '10px', lineHeight: '1.6' }}>{item.a}</p>
        </details>
      ))}
    </section>
  );
}

export default function HelpPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '100px', maxWidth: '760px' }}>
      <Helmet>
        <title>Help &amp; FAQ | SubverseLab</title>
        <meta name="description" content="Answers to common questions about SubverseLab accounts, sign-in, downloads, and how each free tool works." />
        <link rel="canonical" href="https://subverselab.com/help" />
        <meta property="og:title" content="Help &amp; FAQ | SubverseLab" />
        <meta property="og:description" content="Answers to common questions about SubverseLab accounts, sign-in, downloads, and how each free tool works." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://subverselab.com/help" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Link to="/" className="btn btn-outline" style={{ marginBottom: '24px', display: 'inline-block' }}>← Back to Tools</Link>

      <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '8px' }}>Help &amp; FAQ</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '36px' }}>
        Common questions about accounts, downloads, and how each tool works. For anything tool-specific and detailed, check that tool's own <Link to="/learn" style={{ color: 'var(--color-primary)' }}>guide</Link>.
      </p>

      <FaqSection title="General" items={GENERAL_FAQ} />
      <FaqSection title="Tools" items={TOOL_FAQ} />
      <FaqSection title="Loom" items={LOOM_FAQ} />
      <FaqSection title="Contact" items={CONTACT_FAQ} />
    </div>
  );
}
