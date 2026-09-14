import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getSEOArticles } from './services/seoService';
import './index.css';

import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Storefront from './components/Storefront';
import AccountPage from './components/AccountPage';
import AdminPanel from './components/AdminPanel';
import ArticlePage from './components/ArticlePage';
import ToolRoom from './components/ToolRoom';
import HelpPage from './components/HelpPage';
import LoomPage from './components/LoomPage';
import ForumPage from './components/ForumPage';
import Footer from './components/Footer';
import Icon from './components/Icon';
import PageMeta from './components/PageMeta';
import { LEARN_INDEX } from './data/siteMeta';

/* ============================================================
   GLOBAL AUDIO PLAYER
   ============================================================ */
function GlobalPlayer({ track, isPlaying, onPlayPause }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !track) return;
    const url = track.audioUrl || track.demoAudio;
    if (audioRef.current.getAttribute('src') !== url) {
      audioRef.current.setAttribute('src', url);
    }
    if (isPlaying) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    } else {
      audioRef.current.pause();
    }
  }, [track, isPlaying]);

  if (!track) return null;

  return (
    <div className="global-player">
      <audio ref={audioRef} loop />
      <button onClick={() => onPlayPause(track)} style={{
        width: '44px', height: '44px', borderRadius: '50%',
        background: 'var(--color-primary)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, color: '#000',
      }}>
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{track.subtitle}</div>
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '24px' }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{
            width: '3px', borderRadius: '2px', background: 'var(--color-primary)',
            height: isPlaying ? `${6 + (i % 5) * 4}px` : '4px',
            transition: 'height 0.3s ease',
            opacity: isPlaying ? 0.6 + (i % 3) * 0.15 : 0.2,
          }} />
        ))}
      </div>

      <button onClick={() => onPlayPause(null)} style={{
        background: 'none', border: 'none', color: 'var(--color-text-muted)',
        cursor: 'pointer', fontSize: '1.1rem', padding: '4px',
      }} title="Close player"><Icon name="close" size={14} /></button>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [packs, setPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [publishedGuideSlugs, setPublishedGuideSlugs] = useState(new Set());
  // The navbar's search box had no state, no handler and no consumer — typing
  // in it did nothing at all. The query lives here because the input is in the
  // Navbar and the results are in the Storefront.
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Single Firestore read for the whole app — Storefront, ToolRoom, and
  // AdminPanel's Product Management all consume this same `packs` state
  // rather than each querying Firestore (or a nonexistent /api/products)
  // independently. `refreshProducts` lets a caller (e.g. after an admin
  // sync/save) re-run the same query on demand instead of duplicating it.
  const loadProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      // Storefront/ProductActions read pack.image for the cover. New,
      // canonical (Launchpad-synced) products carry it as `coverImage`;
      // legacy pre-Launchpad documents already have a working `image`
      // field of their own (a static asset path) — prefer coverImage when
      // present, but fall back to the legacy field instead of overwriting
      // it with undefined. Fixes the regression where legacy covers
      // disappeared after this normalization was introduced.
      const data = snap.docs.map((d) => {
        const p = d.data();
        const mixCheckOverride = d.id === 'subverse-mix-check' || p.slug === 'subverse-mix-check';
        const coverImage = mixCheckOverride ? '/subverse-mix-check-cover.jpg' : (p.coverImage || p.image);
        return { id: d.id, ...p, coverImage, image: coverImage };
      });
      setPacks(data);
    } catch (err) {
      console.error('Failed to load products from Firestore', err);
      setPacks([]);
    } finally {
      setPacksLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Loaded once, shared everywhere a product card needs to know "does this
  // product have a published guide" — never queried per-card. A product
  // only gets a documentation link once its synced guide has actually been
  // reviewed and published through the existing admin SEO workflow.
  useEffect(() => {
    getSEOArticles({ status: 'published' })
      .then((articles) => setPublishedGuideSlugs(new Set(articles.map((a) => a.slug))))
      .catch(() => setPublishedGuideSlugs(new Set()));
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handlePlayPause = (pack) => {
    if (!pack) { setIsPlaying(false); setActiveTrack(null); return; }
    if (activeTrack && activeTrack.id === pack.id) setIsPlaying(prev => !prev);
    else { setActiveTrack(pack); setIsPlaying(true); }
  };

  const isAdmin = user && ['info@subverselab.com', 'senolsahan037@gmail.com'].includes(user.email);

  const sharedProps = {
    packs, packsLoading, publishedGuideSlugs, user, activeTrack, isPlaying,
    searchQuery,
    onPlayPause: handlePlayPause,
    onLoginClick: () => setAuthModalOpen(true),
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ color: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }}>Loading SubverseLab...</div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Router>
        <div className={`app-container ${activeTrack ? 'has-player' : ''}`}>

          <Navbar
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            user={user}
            onLoginClick={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
          />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Storefront {...sharedProps} />} />

              <Route path="/account" element={
                user
                  ? <AccountPage user={user} packs={packs} onLogout={handleLogout} />
                  : <Navigate to="/" replace />
              } />

              <Route path="/admin" element={
                isAdmin
                  ? <AdminPanel user={user} packs={packs} packsLoading={packsLoading} refreshProducts={loadProducts} />
                  : <Navigate to="/" replace />
              } />

              <Route path="/tools/:slug" element={<ToolRoom {...sharedProps} />} />

              <Route path="/help" element={<HelpPage />} />

              {/* Loom's own page, not a product room: it has no web surface to frame.
                  The path is fixed — https://subverselab.com/loom is named as the
                  canonical home in CITATION.cff, NOTICE, the MCP server's serverInfo
                  and 215 already-published source files, so it cannot be moved. It has
                  to sit above the catch-all, which until now sent every one of those
                  citations to the storefront. */}
              <Route path="/loom" element={<LoomPage />} />

              <Route path="/forum" element={<ForumPage user={user} onLoginClick={() => setAuthModalOpen(true)} />} />
              <Route path="/forum/:topicId" element={<ForumPage user={user} onLoginClick={() => setAuthModalOpen(true)} />} />

              <Route path="/learn/:slug" element={<ArticlePage />} />

              <Route path="/learn" element={
                <div className="container" style={{ paddingTop: '60px', paddingBottom: '80px' }}>
                  <PageMeta title={LEARN_INDEX.title} description={LEARN_INDEX.description} path={LEARN_INDEX.path} />
                  <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.25)', borderRadius: '999px', padding: '5px 14px', marginBottom: '14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-accent)' }}>
                        ◆ Learn Hub
                      </div>
                      <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--color-text)', margin: 0 }}>AI Music Production Guides</h1>
                      <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1rem' }}>In-depth tutorials, workflow templates, and FAQs about SubverseLab tools.</p>
                    </div>
                    <Link to="/" className="btn btn-outline">← Back to Store</Link>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {[].map((g) => (
                      <Link key={g.slug} to={`/learn/${g.slug}`} style={{ textDecoration: 'none' }}>
                        <article style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-accent)', background: 'rgba(42,157,143,0.1)', padding: '4px 10px', borderRadius: '999px', alignSelf: 'flex-start', border: '1px solid rgba(42,157,143,0.3)' }}>{g.cat}</div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: '1.4' }}>{g.title}</h3>
                          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.6', flex: 1 }}>{g.desc}</p>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: '600' }}>Read full guide →</div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Footer />
          </main>

          <GlobalPlayer track={activeTrack} isPlaying={isPlaying} onPlayPause={handlePlayPause} />
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onLoginSuccess={(u) => setUser(u)} />

        </div>
      </Router>
    </HelmetProvider>
  );
}
