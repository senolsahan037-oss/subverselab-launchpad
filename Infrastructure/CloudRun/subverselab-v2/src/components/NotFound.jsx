import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';

// The site's own 404. The server already answers unknown URLs with a real 404
// status (see server.js); this is what a visitor who lands on one actually
// sees, instead of the old silent redirect to the storefront that hid broken
// links and made every wrong URL look like the home page.
export default function NotFound() {
  return (
    <div
      className="container"
      style={{
        paddingTop: '80px',
        paddingBottom: '100px',
        minHeight: '48vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <PageMeta
        title="Page not found | SubverseLab"
        description="This page does not exist. Browse the free SubverseLab music production tools instead."
        noIndex
      />
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-accent)',
          marginBottom: '14px',
        }}
      >
        Error 404
      </div>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
        This page doesn’t exist
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '12px', fontSize: '1rem', maxWidth: '420px' }}>
        The link may be broken or the page may have moved. The tools, guides and plugins are all a click away.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '28px' }}>
        <Link to="/" className="btn btn-primary">Back to the tools</Link>
        <Link to="/help" className="btn btn-outline">Help &amp; FAQ</Link>
      </div>
    </div>
  );
}
