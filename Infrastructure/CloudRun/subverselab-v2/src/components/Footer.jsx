import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      padding: '60px 0 40px',
      marginTop: '60px',
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '32px'
      }}>
        {/* Left Column */}
        <div>
          {/* The full emblem, at the one place on the site with room for it.
              Its spiral and waveform need ~64 px before they resolve, which
              is why the header carries the reduced glyph instead.

              Painted through a CSS mask rather than shipped as a coloured
              image: the artwork is a single alpha-only PNG and the colour
              comes from --color-text, so it is ink on the cream theme and
              cream on the dark one. A pre-tinted cream PNG would have been
              invisible against the light theme's surface. */}
          <div
            className="footer-emblem"
            role="img"
            aria-label="SubverseLab"
          />
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-text)', letterSpacing: '0.5px', marginBottom: '8px' }}>
            SubverseLab
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', maxWidth: '360px', lineHeight: '1.6', margin: '0 0 24px' }}>
            Free, browser-based AI tools for music producers — arranging, generating, analyzing, mixing and stem separation.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>
            © {new Date().getFullYear()} SubverseLab. All rights reserved.
          </div>
        </div>

        {/* Right Column (Socials & Credits) */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <a 
              href="https://www.youtube.com/@SubverseLab" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              YouTube
            </a>
            <a 
              href="https://www.instagram.com/subverse_lab/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Instagram
            </a>
            <a 
              href="https://discord.gg/subverselab" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Discord
            </a>
            <Link
              to="/loom"
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Loom
            </Link>
            <Link
              to="/help"
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Help
            </Link>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Created for subverselab.com
          </div>
        </div>
      </div>
    </footer>
  );
}
