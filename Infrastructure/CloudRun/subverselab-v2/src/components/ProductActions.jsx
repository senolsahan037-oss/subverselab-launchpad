import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

const ProductActions = ({ actions, legacyDownloadUrl, legacyExternalUrl, slug, sourceType, contentType, hasGuide, canDownload = true, onLoginClick }) => {
  // Only rendered when a published guide genuinely exists for this slug
  // (App.jsx loads the published set once, from seo_articles — never
  // hardcoded, never shown for products without one).
  const guideLink = hasGuide && slug ? (
    <Link to={`/learn/${slug}`} className="btn btn-outline">
      <Icon name="guide" /> Guide
    </Link>
  ) : null;

  // 1. New Architecture: Use strictly defined actions from the manifest
  if (actions && Array.isArray(actions) && actions.length > 0) {
    return (
      <div className="product-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {guideLink}
        {actions.map((action, i) => {
          // Remote AI tools launch inside the Tool Room, on-site — never directly
          // to deployment.tool_url. The public launch URL is always /tools/:slug.
          if (action.type === 'launch' && contentType === 'ai_tool' && sourceType === 'remote') {
            if (!slug) return null;
            return (
              <Link key={i} to={`/tools/${slug}`} className="btn btn-primary">
                <Icon name="launch" /> {action.label || 'Launch'}
              </Link>
            );
          }

          if (!action.url) return null;
          let btnClass = 'action-btn';
          let iconName = null;

          switch (action.type) {
            case 'launch':
              btnClass = 'btn btn-primary';
              iconName = 'launch';
              break;
            case 'download':
              btnClass = 'btn btn-secondary';
              iconName = 'download';
              break;
            case 'purchase':
              btnClass = 'btn btn-accent';
              iconName = 'purchase';
              break;
            case 'external':
              btnClass = 'btn btn-outline';
              iconName = 'external';
              break;
            default:
              btnClass = 'btn btn-outline';
          }

          // Download actions require sign-in (canDownload is computed by the
          // caller from auth state — see Storefront.jsx). Blocked, it's a
          // button that opens sign-in instead of a real link, so the action
          // isn't reachable without a session; launch/purchase/external are
          // unaffected. The action's own label is kept rather than replaced
          // with a generic locked one: a product shipping two downloads —
          // "Download (Mac)" and "Download (Win)", as the Splitter did before
          // it became a web tool — collapsed into two identical buttons with
          // nothing to tell them apart.
          if (action.type === 'download' && !canDownload) {
            return (
              <button
                key={i}
                type="button"
                className={btnClass}
                onClick={() => onLoginClick && onLoginClick()}
                title="Sign in to download"
              >
                <Icon name="locked" /> {action.label || 'Sign in to Download'}
              </button>
            );
          }

          return (
            <a
              key={i}
              href={action.url}
              className={btnClass}
              target={action.type === 'download' ? '_self' : '_blank'}
              rel={action.type === 'download' ? '' : 'noopener noreferrer'}
            >
              {iconName && <Icon name={iconName} />}{action.label || 'Access'}
            </a>
          );
        })}
      </div>
    );
  }

  // 2. Legacy Fallback (Isolated for old records without actions)
  return (
    <div className="product-actions legacy-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {guideLink}
      {legacyDownloadUrl && (
        <a href={legacyDownloadUrl} className="btn btn-secondary">
          <Icon name="download" /> Download
        </a>
      )}
      {legacyExternalUrl && (
        <a href={legacyExternalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <Icon name="launch" /> Open App
        </a>
      )}
    </div>
  );
};

export default ProductActions;
