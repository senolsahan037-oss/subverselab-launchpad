import React from 'react';
import Icon from './Icon';
import { DOWNLOAD_PLATFORMS, RELEASE_LABEL } from '../data/plugins';
import { useDownloads, formatSize } from '../hooks/useDownloads';

// One button per platform for a plugin's installer. Active once the build is
// in the downloads manifest ("Download for macOS · v1.0.0 · 12 MB"); until
// then disabled with the release date. Used on the plugin page, /launch and
// the account page.
export default function DownloadButtons({ slug, className = 'plugin-downloads', btnExtra = '' }) {
  const extra = btnExtra ? ` ${btnExtra}` : '';
  const files = useDownloads(slug);
  return (
    <div className={className}>
      {DOWNLOAD_PLATFORMS.map(([key, label]) => {
        const f = files[key];
        if (!f) {
          return (
            <button key={key} type="button" className={`btn btn-outline plugin-buy-closed${extra}`} disabled
                    title={`The ${label} download opens ${RELEASE_LABEL}`}>
              {label} · Available {RELEASE_LABEL}
            </button>
          );
        }
        const size = formatSize(f.size);
        return (
          <a key={key} href={f.url} className={`btn btn-primary${extra}`} download={f.name || true} rel="noopener">
            <Icon name="download" /> Download for {label}
            {f.version ? ` · v${f.version}` : ''}{size ? ` · ${size}` : ''}
          </a>
        );
      })}
    </div>
  );
}
