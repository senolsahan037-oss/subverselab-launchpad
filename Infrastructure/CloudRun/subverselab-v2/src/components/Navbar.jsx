import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useTheme from '../hooks/useTheme';

export default function Navbar({ user, onLoginClick, onLogout, searchQuery = '', onSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = location.pathname;
  const { isDark, toggle } = useTheme();

  return (
    <nav className="navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      height: '70px',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--scrim)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Logo */}
      <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        {/* The brand's reduced waveform glyph — the same mark as the
            favicon, so the tab icon and the header agree. The full emblem
            (golden-ratio spiral, waveform, radiating arcs) is four
            overlapping details and turns to mush below ~64 px; it appears at
            full size in the footer instead. What used to sit here was a
            generic squiggle that belonged to no SubverseLab identity at all. */}
        <svg viewBox="0 0 64 64" width="28" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="64" height="64" rx="14.08" fill="var(--color-primary)" />
          <rect x="5.60" y="24.32" width="6.72" height="15.36" rx="3.36" fill="#0A0A0A" />
          <rect x="17.12" y="16.13" width="6.72" height="31.74" rx="3.36" fill="#0A0A0A" />
          <rect x="28.64" y="8.45" width="6.72" height="47.10" rx="3.36" fill="#0A0A0A" />
          <rect x="40.16" y="16.13" width="6.72" height="31.74" rx="3.36" fill="#0A0A0A" />
          <rect x="51.68" y="24.32" width="6.72" height="15.36" rx="3.36" fill="#0A0A0A" />
        </svg>
        <span className="navbar-wordmark" style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', color: 'var(--color-text)' }}>SUBVERSELAB</span>
      </Link>
      
      {/* Search. This used to be an input with no state, no handler and no
          consumer — typing in it did nothing. It now filters the storefront,
          and typing from another page navigates back to the results. The old
          placeholder still advertised loops and racks, neither of which the
          site has sold since the pivot to tools. */}
      <div className="navbar-search" style={{ flex: 1, maxWidth: '400px', margin: '0 20px', position: 'relative' }}>
        <label htmlFor="site-search" className="sr-only">Search tools and guides</label>
        <input
          id="site-search"
          type="search"
          value={searchQuery}
          placeholder="Search tools and guides"
          onChange={(e) => {
            onSearch?.(e.target.value);
            if (e.target.value && location.pathname !== '/') navigate('/');
          }}
          style={{
            width: '100%',
            padding: '10px 15px 10px 40px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            outline: 'none'
          }}
        />
        <svg style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--color-text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      
      {/* Navigation & Controls */}
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/" style={{ 
          color: activePage === '/' ? 'var(--color-primary)' : 'var(--color-text-muted)', 
          textDecoration: 'none', 
          fontWeight: '600' 
        }}>Tools</Link>

        <Link to="/loom" style={{
          color: activePage === '/loom' ? 'var(--color-primary)' : 'var(--color-text-muted)',
          textDecoration: 'none',
          fontWeight: '600'
        }}>Loom</Link>

        <Link to="/help" style={{
          color: activePage === '/help' ? 'var(--color-primary)' : 'var(--color-text-muted)',
          textDecoration: 'none',
          fontWeight: '600'
        }}>Help</Link>

        <Link to="/forum" style={{
          color: activePage.startsWith('/forum') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          textDecoration: 'none', fontWeight: '600'
        }}>Forum</Link>

        <span
          style={{
            color: activePage === '/account' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
          onClick={() => {
            if (user) navigate('/account');
            else onLoginClick();
          }}
        >
          Account
        </span>

        {user && ['info@subverselab.com', 'senolsahan037@gmail.com'].includes(user.email) && (
          <Link to="/admin" style={{ 
            color: 'var(--color-danger)', 
            textDecoration: 'none', 
            fontWeight: '600' 
          }}>Admin Panel</Link>
        )}
        
        {/* Theme toggle. The site's default is the cream brand palette; this
            is how someone who wants the dark UI keeps it. */}
        <button
          type="button"
          onClick={toggle}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', padding: 0,
            background: 'transparent', cursor: 'pointer',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-muted)'
          }}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>

        {/* E-Commerce Icons */}
        <div className="navbar-account" style={{ display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
          {user && (
            <div title="Your membership credits" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
              </svg>
              <span>Free Tier</span>
            </div>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                title={`Logged in as ${user.email}`}
                onClick={() => navigate('/account')}
                style={{ 
                  width: '32px', height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', cursor: 'pointer' 
                }}
              >
                {user.email[0].toUpperCase()}
              </div>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={onLoginClick}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
