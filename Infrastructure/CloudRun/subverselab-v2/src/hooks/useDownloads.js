import { useEffect, useState } from 'react';
import { DOWNLOADS_MANIFEST } from '../data/plugins';

// Reads the public downloads manifest (see DOWNLOADS_MANIFEST in
// src/data/plugins.js) and returns the files for one plugin:
//   { mac: { url, size, name, version }, win: {...} }  — or {} when nothing is
// published yet, the manifest is still loading, or it could not be fetched.
// A failure is deliberately silent: the buttons simply stay disabled.
//
// One request per page load, shared by every component that asks, and
// no-store so a freshly published build shows up on the next visit.
let pending = null;

function loadManifest() {
  if (!pending) {
    pending = fetch(DOWNLOADS_MANIFEST, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => (m && typeof m === 'object' ? m : {}));
  }
  return pending;
}

export function useDownloads(slug) {
  const [files, setFiles] = useState({});

  useEffect(() => {
    let alive = true;
    loadManifest().then((m) => {
      if (!alive) return;
      const entry = m[slug] || {};
      const out = {};
      for (const [key, f] of Object.entries(entry.files || {})) {
        if (f && typeof f.url === 'string' && /^https:\/\//.test(f.url)) {
          out[key] = { ...f, version: f.version || entry.version || null };
        }
      }
      setFiles(out);
    });
    return () => { alive = false; };
  }, [slug]);

  return files;
}

export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
