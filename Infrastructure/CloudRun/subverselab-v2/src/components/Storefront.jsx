import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import SEOSection from './SEOSection';
import Icon from './Icon';
import PageMeta from './PageMeta';
import { HOME } from '../data/siteMeta';
import ProductActions from './ProductActions';

export default function Storefront({ packs = [], publishedGuideSlugs = new Set(), activeTrack, isPlaying, onPlayPause, user, onLoginClick, searchQuery = '' }) {
  const [filter, setFilter] = useState('all');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportPack, setSelectedReportPack] = useState(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // displayCategory/category are optional, human-authored extras (same gap
  // as subtitle) — content_type is the one field every product actually
  // has, but it's a raw enum value ("ai_tool", underscore-joined), not
  // display text. Normalizing it here means a product that only ever set
  // content_type still filters and displays correctly, instead of silently
  // failing the "AI Tools" filter's exact string match against "ai tool"
  // (space) — which is exactly why most AI tools were invisible under that
  // filter before this normalization existed.
  const rawCategory = (pack) => (pack.displayCategory || pack.category || pack.content_type || '').replace(/_/g, ' ').trim();
  const toTitleCase = (str) => str.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());

  // Search runs across the fields a person would actually recall a tool by —
  // its name, its one-line subtitle, its description and its feature list —
  // rather than the title alone, so "lufs" or "midi" finds the right card.
  const query = searchQuery.trim().toLowerCase();
  const matchesQuery = (p) => {
    if (!query) return true;
    const haystack = [p.title, p.subtitle, p.description, p.metrics, rawCategory(p),
                      ...(Array.isArray(p.tags) ? p.tags : [])]
      .filter(Boolean).join(' ').toLowerCase();
    return query.split(/\s+/).every((word) => haystack.includes(word));
  };

  const filteredPacks = packs
    .filter((p) => filter === 'all' || rawCategory(p).toLowerCase() === filter.toLowerCase())
    .filter(matchesQuery);

  const getCategoryClass = (cat) => cat.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <PageMeta title={HOME.title} description={HOME.description} path={HOME.path} />

      {/* ── Compact Hero ── */}
      <div className="container">
        <header style={{
          padding: '32px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '20px',
        }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.25)',
              borderRadius: '999px', padding: '3px 10px', marginBottom: '10px',
              fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '1px', color: 'var(--color-accent)',
            }}>
              ◆ Free Tools for Producers
            </div>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '900',
              letterSpacing: '-0.5px', lineHeight: '1.15', margin: '0 0 8px',
              background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-primary) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              textWrap: 'balance',
            }}>
              SubverseLab: Free AI Tools for Music Producers
            </h1>
            <p style={{
              fontSize: '0.9rem', color: 'var(--color-text-muted)',
              margin: 0, lineHeight: '1.5',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              Browser-based AI tools for arranging, generating, analyzing, mixing, and separating a track into stems. Nothing to install.
            </p>
          </div>

          {/* Right: CTA */}
          {!user && (
            <button
              className="btn btn-primary"
              style={{ padding: '11px 24px', fontSize: '0.9rem', flexShrink: 0 }}
              onClick={onLoginClick}
            >
              Join Free →
            </button>
          )}
        </header>

        {/* ── Category Filters (flush below hero) ── */}
        {/* No Plugins filter. It existed for one product, the Splitter, which
            became a web tool in August 2026 — leaving a tab that could only
            ever answer "No products found in this category". Workflows stays
            despite holding no products of its own: it renders the channel's
            uploads rather than a product grid. */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { key: 'all',         label: 'All' },
            { key: 'ai tool',     label: 'AI Tools' },
            { key: 'workflow',    label: 'Workflows' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >{label}</button>
          ))}
        </div>

        {/* Workflows — SubverseLab's own YouTube uploads, not a product grid.
            UUVet5uzZrX2MCFBMsr_e8rA is the channel's auto-generated uploads
            playlist (its own channel id, UCVet5uzZrX2MCFBMsr_e8rA, with the
            UC prefix swapped for UU — YouTube's standard convention), so
            this always reflects whatever's actually been uploaded without
            needing a video id hardcoded and kept in sync by hand. */}
        {filter === 'workflow' && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>Production Workflows</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Walkthroughs and production workflows from the SubverseLab YouTube channel.
            </p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe
                src="https://www.youtube.com/embed/videoseries?list=UUVet5uzZrX2MCFBMsr_e8rA"
                title="SubverseLab production workflows on YouTube"
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <a
              href="https://www.youtube.com/@SubverseLab"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ marginTop: '16px', display: 'inline-block' }}
            >
              Subscribe on YouTube
            </a>
          </div>
        )}

        {/* Pack Grid */}
        <div className="card-grid">
          {filteredPacks.map((pack, index) => {
            const isCurrentTrack = activeTrack && activeTrack.id === pack.id;
            const isCurrentTrackPlaying = isCurrentTrack && isPlaying;
            const categoryClass = getCategoryClass(rawCategory(pack));
            const displayCat = toTitleCase(rawCategory(pack));
            const packPrice = pack.price || 0;
            const isFree = packPrice === 0;
            // Every current product is free; canDownload just needs a
            // session. Purchase/ownership verification (the old
            // hasPurchased check) had no real backend behind it — every
            // product on the site is free today, and a real paid product
            // would need that backend built for real before this can gate
            // anything meaningful again.
            const canDownload = isFree ? !!user : false;

            return (
              <div
                key={pack.id}
                className={`pack-card fade-in delay-${(index % 4) + 1} ${pack.content_type === 'ai_tool' ? 'ai-tool-card' : ''}`}
              >
                {/* Image */}
                <div className="pack-image-container">
                  {pack.image && <img src={pack.image} className="pack-image" alt={pack.title} />}
                  <div className="pack-image-glow" style={{ background: `radial-gradient(circle at center, ${pack.accentColor || 'var(--color-primary)'} 0%, transparent 70%)` }}></div>
                  <div className={`pack-image-banner badge-${categoryClass}`}>{displayCat}</div>

                  {isCurrentTrackPlaying && pack.preview?.storageUrl && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <div className="visualizer-container">
                        {[1,2,3,4,5].map(i => <div key={i} className="visualizer-bar" style={{ background: pack.accentColor || 'var(--color-primary)' }}></div>)}
                      </div>
                    </div>
                  )}

                  {pack.id !== 'subverse-splitter' && pack.preview?.storageUrl && (
                    <div className="audio-overlay">
                      <button className="play-trigger-btn" onClick={(e) => { e.stopPropagation(); onPlayPause(pack); }}>
                        {isCurrentTrackPlaying ? (
                          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="4" height="16"></rect><rect x="16" y="4" width="4" height="16"></rect></svg>
                        ) : (
                          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="pack-info">
                  <h3 className="pack-title">{pack.title}</h3>
                  {/* subtitle is a UI-only extra, never required by the
                      manifest schema — falling back to description (a
                      required field on every product) means a card can
                      never render with a half-empty info area just because
                      whoever registered it didn't also set a subtitle. */}
                  {(pack.subtitle || pack.description) && (
                    <div className="pack-subtitle">{pack.subtitle || pack.description}</div>
                  )}

                  {pack.metrics && (
                    <div className="metrics-row">
                      {pack.metrics.split(' • ').map((m, i, arr) => (
                        <React.Fragment key={i}>
                          <span>{m}</span>
                          {i < arr.length - 1 && <span className="metric-dot"></span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* One quiet meta row: the guide sits here as a small link,
                      not as a second button competing with the call to action.
                      A card should present one thing to press. */}
                  <div className="pack-meta-row">
                    {publishedGuideSlugs.has(pack.id) ? (
                      <Link to={`/learn/${pack.id}`} className="pack-guide-link">
                        <Icon name="guide" size={13} /> Guide
                      </Link>
                    ) : <span />}
                    {packPrice > 0 ? (
                      <span className="pack-price">
                        {pack.originalPrice > packPrice && <span className="original-price">${pack.originalPrice}</span>}
                        <span style={{ fontSize: '1.05rem', color: 'var(--color-primary)', fontWeight: '800' }}>${packPrice}</span>
                      </span>
                    ) : pack.size ? (
                      <span className="pack-size-muted">{pack.size}</span>
                    ) : <span />}
                  </div>

                  {/* CTA Button */}
                  <div style={{ marginTop: 'auto' }}>
                    <ProductActions
                      actions={pack.actions}
                      slug={pack.id}
                      sourceType={pack.source_type}
                      contentType={pack.content_type}
                      hasGuide={false}
                      canDownload={canDownload}
                      onLoginClick={onLoginClick}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {filteredPacks.length === 0 && filter !== 'workflow' && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
              {query
                ? `Nothing matches “${searchQuery.trim()}”.`
                : 'No products found in this category.'}
            </div>
          )}
        </div>

        {/* Report Button */}
        <div style={{ margin: '20px 0 60px', textAlign: 'center' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }}
            onClick={() => { setSelectedReportPack(null); setReportModalOpen(true); setReportSuccess(''); }}>
            <Icon name="warning" /> Report Broken Link or Technical Issue
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="modal-overlay" onClick={() => setReportModalOpen(false)}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button className="modal-close" onClick={() => setReportModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', fontWeight: 'bold' }}>Report an Issue</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Report broken download links, archive errors, or platform glitches.
            </p>

            {reportSuccess ? (
              <div style={{ color: 'var(--color-accent)', padding: '16px', backgroundColor: 'rgba(42,157,143,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(42,157,143,0.3)' }}>
                {reportSuccess}
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const selectedProdId = form.productId.value;
                const prodObj = packs.find(p => p.id === selectedProdId);
                const prodTitle = prodObj ? prodObj.title : 'General Issue';
                setReportSubmitting(true);
                try {
                  await addDoc(collection(db, 'reports'), {
                    productId: selectedProdId,
                    productTitle: prodTitle,
                    os: form.os.value,
                    userEmail: form.userEmail.value || 'Anonymous',
                    description: form.description.value,
                    createdAt: new Date().toISOString(),
                    status: 'Pending'
                  });
                  setReportSuccess('Thank you! Your issue has been submitted.'); 
                  setReportDescription(''); 
                } catch (err) { console.error(err); } finally { setReportSubmitting(false); }
              }}>
                <div className="input-group">
                  <label>Affected Product</label>
                  <select name="productId" defaultValue={selectedReportPack?.id || 'general'} className="input-field">
                    <option value="general">General / Storefront</option>
                    {packs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Operating System</label>
                  <select name="os" defaultValue="macOS" className="input-field">
                    <option>macOS</option><option>Windows</option><option>Linux</option><option>iOS / iPadOS</option><option>Android</option><option>Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Your Email</label>
                  <input type="email" name="userEmail" defaultValue={user?.email || ''} placeholder="your@email.com" required className="input-field" />
                </div>
                <div className="input-group">
                  <label>Issue Details</label>
                  <textarea name="description" value={reportDescription} onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="e.g., Download button returns 404 error..." required rows={4} className="input-field" />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setReportModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={reportSubmitting}>
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* SEO FAQ + Blog Section */}
      <SEOSection />
    </div>
  );
}
