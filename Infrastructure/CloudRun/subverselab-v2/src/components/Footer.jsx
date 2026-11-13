import React from 'react';
import { Link } from 'react-router-dom';
import { openConsentSettings } from '../consent';
import FooterStrips, { FooterStores } from './FooterStrips';
import { media } from '../utils/endpoints';
import { sendSocialClick } from '../hooks/useHitCounter';
import { CONTACT } from '../data/faqContent';

const SOCIAL = [
  { name: 'YouTube', ch: 'youtube', href: 'https://www.youtube.com/@SubverseLab', icon: media('/social/youtube.svg') },
  { name: 'Instagram', ch: 'instagram', href: 'https://www.instagram.com/subverse_lab/', icon: media('/social/instagram.svg') },
  { name: 'SoundCloud', ch: 'soundcloud', href: 'https://soundcloud.com/subverselab', icon: media('/social/soundcloud.svg') },
  { name: 'TikTok', ch: 'tiktok', href: 'https://www.tiktok.com/@subverselab', icon: media('/social/tiktok.svg') },
  // rel="me": Mastodon shows subverselab.com as a verified link on the profile once this page carries it (owner 5 Nov 2026).
  { name: 'Mastodon', ch: 'mastodon', href: 'https://mastodon.social/@SubverseLab', icon: media('/social/mastodon.svg'), rel: 'me' },
  // Bluesky and Ko-fi (owner 6 Nov 2026). Threads joins once the SubverseLab Threads profile exists.
  { name: 'Bluesky', ch: 'bluesky', href: 'https://bsky.app/profile/subverselab.bsky.social', icon: media('/social/bluesky.svg') },
  { name: 'Ko-fi', ch: 'kofi', href: 'https://ko-fi.com/subverselab', icon: media('/social/kofi.svg') },
  // X: the owner's old personal account @SenolSahan50530 (0 posts) renamed to @SubverseLab on 6 Nov 2026.
  { name: 'X', ch: 'x', href: 'https://x.com/SubverseLab', icon: media('/social/x.svg') },
];

// The footer's links in three columns (owner 31 Oct). Store first, then what a signed-in person needs, then the studio.
const FOOTER_COLUMNS = [
  { title: 'Store', links: [
    { label: 'Plugins', to: '/plugins' }, { label: 'Sample packs', to: '/sample-packs' }, { label: 'Preset packs', to: '/preset-packs' }, { label: 'Browser tools', to: '/tools' },
  ] },
  { title: 'Account', links: [
    { label: 'Download Room', to: '/launch2' }, { label: 'Your account', to: '/account' }, { label: 'Redeem a code', to: '/redeem' }, { label: 'Testers', to: '/testers' }, { label: 'Forum', to: '/forum' },
  ] },
  { title: 'SubverseLab', links: [
    { label: 'Loom', to: '/loom' }, { label: 'Help', to: '/help' }, { label: 'Contact', to: '/help#contact' }, { label: 'Privacy', to: '/privacy' }, { label: 'Terms', to: '/terms' }, { label: 'Refunds', to: '/refunds' },
    { label: 'Cookie settings', onClick: openConsentSettings },
  ] },
];

export default function Footer() {
  return (
    <footer className="svl-divider-top" style={{
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
            Plugins for macOS and Windows, sample packs, Ableton Live racks and browser tools, made by SubverseLab for producers who want to finish the track.
          </p>
          {/* Contact on every page: city and e-mail only (owner 12 Nov 2026); full address is on /help#contact. */}
          <address className="footer-contact">
            <span>{CONTACT.city}</span>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </address>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            © {new Date().getFullYear()} SubverseLab. All rights reserved.
          </div>
          {/* The social accounts as icons, apart from the page links and on the opposite side of the footer from them (owner
              30 Oct). Marks from simple-icons (CC0), painted in the footer's ink through a CSS mask like the emblem; the name is
              the link's accessible label. */}
          <div className="footer-social">
            {SOCIAL.map((x) => (
              <a key={x.name} href={x.href} target="_blank" rel={x.rel ? `${x.rel} noopener noreferrer` : 'noopener noreferrer'} className="footer-social-link" aria-label={x.name} title={x.name} onClick={() => sendSocialClick(x.ch)}>
                <span className="footer-social-mark" style={{ WebkitMaskImage: `url(${x.icon})`, maskImage: `url(${x.icon})` }} />
              </a>
            ))}
          </div>
        </div>

        {/* Middle (owner 5 Nov): the stores take turns in the gap between the two columns. */}
        <FooterStores />

        {/* Right side (owner 31 Oct, "derin boşluk"): the links as three short columns, Store / Account / SubverseLab, so the
            right half stands as tall as the brand column instead of one line with a hole under it. */}
        <nav className="footer-cols" aria-label="Site">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="footer-col">
              <div className="footer-col-title">{col.title}</div>
              {col.links.map((l) => (l.onClick
                ? <button key={l.label} type="button" className="footer-link footer-link-button" onClick={l.onClick}>{l.label}</button>
                : <Link key={l.label} to={l.to} className="footer-link">{l.label}</Link>))}
            </div>
          ))}
        </nav>
      </div>
      {/* Owner 31 Oct: the strips squeezed between the two columns left a wide hole under the links on big screens. They now run
          the full width under both columns, where every logo has room and the two rows read as one band. */}
      <div className="container footer-strips-row">
        <FooterStrips />
      </div>
    </footer>
  );
}
