import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import { LEGAL_UPDATED, LEGAL_EMAIL } from '../data/legalContent';

// Turns the contact address into a mailto link; everything else is plain text.
function WithMail({ text }) {
  const parts = String(text).split(LEGAL_EMAIL);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && <a href={`mailto:${LEGAL_EMAIL}`} style={{ color: 'var(--color-primary)' }}>{LEGAL_EMAIL}</a>}
    </React.Fragment>
  ));
}

// One shared page for the Privacy Policy and the Terms of Use; the words live
// in src/data/legalContent.js so the prerender can write the same text.
export default function LegalPage({ doc }) {
  const other = doc.path === '/privacy' ? { to: '/terms', label: 'Terms of Use' } : { to: '/privacy', label: 'Privacy Policy' };
  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '100px', maxWidth: '760px' }}>
      <PageMeta title={doc.title} description={doc.description} path={doc.path} />

      <Link to="/" className="btn btn-outline" style={{ marginBottom: '24px', display: 'inline-block' }}>← Back to Tools</Link>

      <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '8px' }}>{doc.h1}</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Last updated: {LEGAL_UPDATED}</p>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '36px' }}>{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '14px' }}>{s.h}</h2>
          {s.blocks.map((b, i) => (Array.isArray(b) ? (
            <ul key={i} style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', paddingLeft: '22px', margin: '0 0 14px' }}>
              {b.map((li) => <li key={li} style={{ marginBottom: '8px' }}><WithMail text={li} /></li>)}
            </ul>
          ) : (
            <p key={i} style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', margin: '0 0 14px' }}><WithMail text={b} /></p>
          )))}
        </section>
      ))}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        See also: <Link to={other.to} style={{ color: 'var(--color-primary)' }}>{other.label}</Link>
      </p>
    </div>
  );
}
