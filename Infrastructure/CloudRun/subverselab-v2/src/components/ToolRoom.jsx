import React, { useCallback, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Icon from './Icon';
import PageMeta from './PageMeta';
import { auth } from '../firebase';

// The Tool Room's only job: discover the product, apply the website-side
// access gate, and render the independently deployed tool inside an iframe
// (or a safe fallback) without ever leaving subverselab.com. It never hosts,
// bundles, or proxies the tool itself — deployment.tool_url is only ever
// used as the iframe src, never as a redirect target.
export default function ToolRoom({ packs, packsLoading, publishedGuideSlugs, user, onLoginClick }) {
  const { slug } = useParams();
  const iframeRef = useRef(null);
  const product = (packs || []).find((p) => p.id === slug);

  // A remote tool lives on its own origin, so the browser correctly isolates
  // its Firebase Auth session from subverselab.com's — being signed in here
  // doesn't make the iframe signed in, which is why it was silently
  // re-prompting for Google sign-in every time. This hands the session
  // across explicitly: mint a short-lived Firebase custom token for the
  // already-signed-in user and post it to the iframe's own origin only
  // (never '*' — a stray postMessage target could leak it). The tool's own
  // Firebase Auth SDK turns that into a real, auto-refreshing session via
  // signInWithCustomToken(), so this only needs to run once per iframe load.
  const handoffSession = useCallback(async () => {
    if (!user || !auth.currentUser || !iframeRef.current || !product?.deployment?.tool_url) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      // Deliberately not metadata-sync-service: that runs in a different GCP
      // project than the Firebase project these tools authenticate against,
      // and a custom token it signs is never trusted by Identity Toolkit for
      // this project (CREDENTIAL_MISMATCH) — org policy blocks the usual
      // fixes (cross-project service account attachment, service account
      // keys). tool-auth-bridge runs natively in the Firebase project itself.
      const apiUrl = import.meta.env.VITE_TOOL_AUTH_BRIDGE_URL;
      if (!apiUrl) return;
      const res = await fetch(`${apiUrl}/api/auth/tool-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) return;
      const { customToken } = await res.json();
      const toolOrigin = new URL(product.deployment.tool_url).origin;
      iframeRef.current.contentWindow.postMessage(
        { type: 'subverselab:auth-token', token: customToken },
        toolOrigin
      );
    } catch (err) {
      console.error('[ToolRoom] Could not hand off session to tool:', err);
    }
  }, [user, product?.deployment?.tool_url]);

  // The iframe's load event can fire before the tool's own React tree has
  // mounted the listener that receives the token, and a token posted into a
  // window with no listener is simply lost — leaving a signed-in member
  // staring at a sign-in wall until they reload. Tools announce readiness
  // instead of guessing; this answers that announcement, and only from the
  // tool's own origin.
  useEffect(() => {
    const toolUrl = product?.deployment?.tool_url;
    if (!toolUrl) return undefined;
    let toolOrigin;
    try {
      toolOrigin = new URL(toolUrl).origin;
    } catch {
      return undefined;
    }
    const onMessage = (event) => {
      if (event.origin !== toolOrigin) return;
      if (event.data?.type === 'subverselab:tool-ready') {
        handoffSession();
        return;
      }
      // A tool asking for sign-in. It has no login of its own and must not grow
      // one, so the request comes here and the website opens its own modal —
      // the credential is entered on subverselab.com, on subverselab.com's
      // origin, exactly as Rules/03 requires. The tool only ever asks.
      if (event.data?.type === 'subverselab:request-sign-in') {
        onLoginClick?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [product?.deployment?.tool_url, handoffSession, onLoginClick]);

  // Hand the session over again the moment one appears.
  //
  // Without this the sign-in flow ended one step short: handoffSession only ran
  // on iframe load and on the tool's ready ping, and both had already happened
  // while the visitor was signed out — it returned early each time. So someone
  // who spent ten minutes building something, hit export, signed in through the
  // modal that opens over this page, and came back to a tool that was still
  // signed out. The only way through was a reload, which threw the ten minutes
  // away. The iframe is never remounted here, so re-running the handoff hands
  // the session across with their work still on screen.
  //
  // It has to sit here, above every early return, and that is not a matter of
  // taste. It was written further down, past the members wall, so a signed-out
  // visitor on a gated tool returned before reaching it and React counted one
  // hook fewer. Signing in let the render continue past the wall, the hook ran
  // for the first time, and React threw "Rendered more hooks than during the
  // previous render" — which unmounts the tree and leaves a blank page. That
  // is exactly what "I click Continue with Google and it drops me on an empty
  // page" was: not the sign-in failing, but this component crashing the instant
  // it succeeded. Hooks run unconditionally or they do not work.
  useEffect(() => {
    if (user) handoffSession();
  }, [user, handoffSession]);

  const unavailable = (title, message) => (
    <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
      <PageMeta title={`${title} | SubverseLab`} noIndex />
      <h2 style={{ marginBottom: '12px' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>{message}</p>
      <Link to="/" className="btn btn-outline">← Back to Tools</Link>
    </div>
  );

  if (packsLoading) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <PageMeta title="Loading… | SubverseLab" />
        <div style={{ color: 'var(--color-primary)' }}>Loading tool…</div>
      </div>
    );
  }

  if (!product) {
    return unavailable('Tool Unavailable', "This tool couldn't be found.");
  }
  if (product.source_type !== 'remote') {
    return unavailable('Tool Unavailable', 'This product is not a remote tool.');
  }
  if (!product.deployment?.tool_url) {
    return unavailable('Tool Unavailable', 'This tool has no registered deployment URL.');
  }

  // A signed-out visitor on a member-gated tool used to get a bare "Sign In
  // Required" wall — no title, no description, nothing explaining what the
  // tool even was. That's a dead end for someone arriving from a search
  // result, and it's why these URLs were kept out of the sitemap: there was
  // no content on them worth indexing. This shows the real page instead —
  // what the tool is, what it measures or generates, and a link to its full
  // guide — with only the tool itself behind the sign-in. Crawlers and
  // signed-out humans see exactly the same thing, so nothing here is cloaked.
  // access.public_shell is the product saying its own shell is safe to show to
  // anyone — the tool renders, and it refuses the productive operations itself,
  // server-side on its own origin (Rules/00 §5). Blocking the iframe here as
  // well meant those tools declared a public shell and then never got to show
  // one: a signed-out visitor reached a product room with no product in it,
  // which reads as broken rather than as locked. Tools without a public shell
  // still get the signpost, because there is nothing safe to render for them.
  const requiresMember = product.access?.level === 'member';
  const hasPublicShell = product.access?.public_shell === true;
  if (requiresMember && !user && !hasPublicShell) {
    const hasGuide = publishedGuideSlugs?.has?.(product.id);
    return (
      <div className="container" style={{ maxWidth: '760px', padding: '64px 20px 96px' }}>
        <PageMeta
          title={`${product.title} | SubverseLab`}
          description={product.description}
          path={`/tools/${product.slug || product.id}`}
          image={product.coverImage}
        />
        <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Tools</Link>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '20px 0 8px' }}>{product.title}</h1>
        {product.subtitle && (
          <p style={{ color: 'var(--color-primary)', fontWeight: '600', margin: '0 0 20px' }}>{product.subtitle}</p>
        )}
        {product.description && (
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', margin: '0 0 20px' }}>{product.description}</p>
        )}
        {product.metrics && (
          <p style={{ color: 'var(--color-text)', margin: '0 0 28px' }}>{product.metrics}</p>
        )}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-primary" onClick={onLoginClick}>Sign in to use {product.title}</button>
          {hasGuide && <Link to={`/learn/${product.id}`} className="btn btn-outline">Read the guide</Link>}
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '16px' }}>
          Free account — no payment, no card.
        </p>
      </div>
    );
  }

  if (!product.deployment.iframe_compatible) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <PageMeta
          title={`${product.title} | SubverseLab`}
          description={product.description}
          path={`/tools/${product.slug || product.id}`}
        />
        <h2 style={{ marginBottom: '12px' }}>{product.title}</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
          This tool isn't set up for in-page embedding and opens in a new tab.
        </p>
        <a href={product.deployment.tool_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <Icon name="external" /> {product.actions?.[0]?.label || `Open ${product.title}`}
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      <PageMeta
        title={`${product.title} | SubverseLab`}
        description={product.description}
        path={`/tools/${product.slug || product.id}`}
        image={product.coverImage}
      />
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
      }}>
        <Link to="/" className="btn btn-outline">← Back to Tools</Link>
        <strong style={{ color: 'var(--color-text)' }}>{product.title}</strong>
      </div>
      <iframe
        ref={iframeRef}
        src={product.deployment.tool_url}
        title={product.title}
        allow="autoplay; fullscreen"
        style={{ flex: 1, width: '100%', border: 'none' }}
        onLoad={handoffSession}
      />
    </div>
  );
}
