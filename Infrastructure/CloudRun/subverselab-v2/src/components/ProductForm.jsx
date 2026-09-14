import React, { useState } from 'react';
import { auth } from '../firebase';

// Mirrors validateRemoteToolManifest() in
// Infrastructure/MetadataSync/metadata-sync-service/server.js exactly, so a
// bad upload is rejected the moment the file is chosen instead of after a
// round trip to the backend. Collects every problem instead of stopping at
// the first one, since fixing one field at a time is a bad admin experience.
// This is a client-side convenience check only — the server re-validates
// everything and remains the actual authority, including the parts (DNS-based
// private-IP blocking in isSafeUrl) that a browser cannot perform at all.
const ALLOWED_CONTENT_TYPES = ['ai_tool', 'workflow', 'preset', 'pack', 'project', 'instrument_rack', 'midi_pack', 'sample_pack'];
const ALLOWED_ACCESS_LEVELS = ['public', 'member'];
const ALLOWED_ACTION_TYPES = ['launch', 'download', 'purchase', 'external'];
const ALLOWED_TOOL_DOMAINS = ['*.run.app', 'subverselab.com', '*.subverselab.com', 'youtube.com', 'youtu.be'];

// Mirrors the same constants in metadata-sync-service/server.js. The approved
// slug list lives in code, not in the manifest, so a product cannot grant
// itself the no-quota exception (Rules/00_PLATFORM_INVARIANTS.md §5).
// Each approved slug carries its own productive operations: no two tools share
// a vocabulary, and one shared list would either reject a valid manifest or let
// a tool under-declare its gated paths. Mirrors metadata-sync-service.
const MEMBER_NO_PRODUCT_QUOTA_APPROVED = new Map([
  ['sensei', ['generate', 'variation', 'export']],
  ['synthpulse', ['generate', 'evolve', 'export']]
]);
const QUOTA_FIELDS = ['quota', 'quotas', 'credits', 'credit', 'daily_limit', 'monthly_limit', 'rate_limit', 'usage_limit', 'limits'];
const TOKEN_FORWARDING_FIELDS = ['token_forwarding', 'forward_token', 'session_bridge', 'auth_bridge', 'pass_token'];

function validateRemoteManifestClient(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return ['Manifest is not a JSON object.'];

  const required = ['slug', 'name', 'description', 'content_type', 'source_type', 'version', 'guide_version', 'deployment', 'access', 'actions'];
  for (const f of required) {
    if (!manifest[f]) errors.push(`Missing required field: ${f}`);
  }
  if (manifest.source_type && manifest.source_type !== 'remote') {
    errors.push('source_type must be "remote"');
  }
  if (manifest.content_type && !ALLOWED_CONTENT_TYPES.includes(manifest.content_type)) {
    errors.push(`Invalid content_type: ${manifest.content_type}`);
  }

  if (manifest.deployment) {
    if (typeof manifest.deployment !== 'object') {
      errors.push('deployment must be an object');
    } else {
      if (!manifest.deployment.provider) errors.push('deployment.provider is required');
      if (!manifest.deployment.tool_url) {
        errors.push('deployment.tool_url is required');
      } else {
        try {
          const url = new URL(manifest.deployment.tool_url);
          if (url.protocol !== 'https:') {
            errors.push('deployment.tool_url must be HTTPS');
          } else if (!ALLOWED_TOOL_DOMAINS.some(d => d.startsWith('*.') ? (url.hostname.endsWith(d.slice(1)) || url.hostname === d.slice(2)) : url.hostname === d)) {
            errors.push(`deployment.tool_url domain "${url.hostname}" is not on the allowed list (${ALLOWED_TOOL_DOMAINS.join(', ')})`);
          }
        } catch {
          errors.push('deployment.tool_url is not a valid URL');
        }
      }
      if (typeof manifest.deployment.iframe_compatible !== 'boolean') {
        errors.push('deployment.iframe_compatible must be true or false');
      }
    }
  }

  if (manifest.access) {
    if (typeof manifest.access !== 'object') {
      errors.push('access must be an object');
    } else {
      if (!ALLOWED_ACCESS_LEVELS.includes(manifest.access.level)) {
        errors.push(`Invalid access.level: ${manifest.access.level} (must be "public" or "member")`);
      }
      if (manifest.access.policy !== undefined) {
        if (manifest.access.policy !== 'member_no_product_quota'
          || !MEMBER_NO_PRODUCT_QUOTA_APPROVED.has(manifest.slug)
          || manifest.access.level !== 'member') {
          errors.push(`member_no_product_quota is reserved for approved member-gated manifests (${[...MEMBER_NO_PRODUCT_QUOTA_APPROVED.keys()].join(', ')})`);
        }
        if (typeof manifest.access.public_shell !== 'boolean') {
          errors.push('member_no_product_quota requires access.public_shell to be stated as true or false');
        }
        if (manifest.access.self_authenticated !== true) {
          errors.push('member_no_product_quota requires access.self_authenticated: true');
        }
        if (manifest.access.enforcement !== 'tool_server') {
          errors.push('member_no_product_quota requires access.enforcement: "tool_server"');
        }
        if (!Array.isArray(manifest.access.member_required_for) || manifest.access.member_required_for.length === 0) {
          errors.push('member_no_product_quota requires a non-empty access.member_required_for array');
        } else {
          for (const op of MEMBER_NO_PRODUCT_QUOTA_APPROVED.get(manifest.slug) ?? []) {
            if (!manifest.access.member_required_for.includes(op)) {
              errors.push(`member_no_product_quota requires "${op}" in access.member_required_for`);
            }
          }
        }
        for (const source of [manifest, manifest.access]) {
          for (const field of QUOTA_FIELDS) {
            if (source[field] !== undefined) {
              errors.push(`${field} must not appear in a member_no_product_quota manifest`);
            }
          }
        }
      }
    }
  }

  // Global invariant, checked on every remote manifest — nothing may declare
  // that the Launchpad forwards identity across the origin boundary.
  for (const source of [manifest, manifest.access, manifest.deployment]) {
    if (!source || typeof source !== 'object') continue;
    for (const field of TOKEN_FORWARDING_FIELDS) {
      if (source[field] !== undefined && source[field] !== false) {
        errors.push(`${field} is forbidden — no auth token is forwarded from the Launchpad to a remote tool`);
      }
    }
  }

  if (manifest.actions) {
    if (!Array.isArray(manifest.actions) || manifest.actions.length === 0) {
      errors.push('actions must be a non-empty array');
    } else {
      manifest.actions.forEach((action, i) => {
        if (!ALLOWED_ACTION_TYPES.includes(action.type)) {
          errors.push(`actions[${i}]: invalid type "${action.type}"`);
        }
        if (action.type === 'launch' && action.url) {
          errors.push(`actions[${i}]: a "launch" action must not carry a url — the public launch URL is always /tools/:slug`);
        }
      });
    }
  }

  return errors;
}

const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProductForm({ product, onSave, onCancel }) {
  const isEditing = !!product;

  const [syncType, setSyncType] = useState('remote'); // 'remote' or 'folder'
  const [manifestFile, setManifestFile] = useState(null);
  const [guideFile, setGuideFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  const [manifestErrors, setManifestErrors] = useState([]);
  const [coverError, setCoverError] = useState(null);
  const [guideError, setGuideError] = useState(null);
  const [checking, setChecking] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const handleManifestChange = async (e) => {
    const file = e.target.files[0] || null;
    setManifestFile(file);
    setManifestErrors([]);
    if (!file) return;
    setChecking(true);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        setManifestErrors([`Not valid JSON: ${parseErr.message}`]);
        return;
      }
      setManifestErrors(validateRemoteManifestClient(parsed));
    } finally {
      setChecking(false);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0] || null;
    setCoverFile(file);
    if (file && !ALLOWED_COVER_TYPES.includes(file.type)) {
      setCoverError(`Unsupported cover type "${file.type}" — must be JPEG, PNG, or WebP.`);
    } else {
      setCoverError(null);
    }
  };

  const handleGuideChange = async (e) => {
    const file = e.target.files[0] || null;
    setGuideFile(file);
    if (!file) { setGuideError(null); return; }
    const text = await file.text();
    setGuideError(text.trim().length === 0 ? 'Guide file is empty.' : null);
  };

  const remoteReady = syncType !== 'remote' || (
    manifestFile && guideFile && coverFile &&
    manifestErrors.length === 0 && !coverError && !guideError
  );

  const handleSync = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatusMsg('Syncing metadata... This may take a while.');
    
    try {
      // Force a fresh ID token rather than trusting the SDK's cached one.
      // A stale cached token (long-open admin tab, backgrounded-tab timer
      // throttling, or simply outliving its ~1hr lifetime during a session)
      // is indistinguishable from a missing token to verifyAdmin() on the
      // backend — both come back as 401 "Invalid or expired token" — so the
      // safe default here is to always mint a current one at submit time.
      const token = await auth.currentUser.getIdToken(true);
      const apiUrl = import.meta.env.VITE_METADATA_SYNC_API_URL;
      
      if (!apiUrl) throw new Error("System Error: VITE_METADATA_SYNC_API_URL is missing.");

      let res;
      if (syncType === 'remote') {
        if (!manifestFile) throw new Error("Please select a manifest.json file.");
        if (!guideFile) throw new Error("Please select a guide file.");
        if (!coverFile) throw new Error("Please select a cover image.");
        const manifestText = await manifestFile.text();
        const formData = new FormData();
        formData.append('manifest', manifestText);
        formData.append('guideFile', guideFile);
        formData.append('coverFile', coverFile);
        res = await fetch(`${apiUrl}/api/admin/sync-remote-metadata`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        if (!zipFile) throw new Error("Please select a ZIP file.");
        const formData = new FormData();
        formData.append('zipFile', zipFile);
        res = await fetch(`${apiUrl}/api/admin/sync-folder-metadata`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      setStatusMsg(
        (data.message || 'Sync successful!') +
        ' The product is live; its guide was saved as a draft — publish it from the SEO tab when it is ready to show publicly.'
      );

      // Since backend already saves to Firestore, we just complete the form
      setTimeout(() => {
        onSave({ slug: data.slug });
      }, 1500);

    } catch (err) {
      console.error(err);
      setError("Sync Error: " + err.message);
      setStatusMsg('');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' };

  return (
    <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--color-primary)' }}>{isEditing ? 'Sync Existing Product' : 'Add New Product'}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
        The SubverseLab Admin Panel is a metadata synchronization interface. 
        Select the sync type and provide the source. The backend will validate and import everything.
      </p>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: '15px' }}>{error}</p>}
      {statusMsg && <p style={{ color: 'var(--color-accent)', marginBottom: '15px', fontWeight: 'bold' }}>{statusMsg}</p>}
      
      <form onSubmit={handleSync}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" name="syncType" checked={syncType === 'remote'} onChange={() => setSyncType('remote')} />
            Remote Sync (Cloud Run)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" name="syncType" checked={syncType === 'folder'} onChange={() => setSyncType('folder')} />
            Folder Sync (Upload ZIP)
          </label>
        </div>

        {syncType === 'remote' ? (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-accent)', fontWeight: 'bold' }}>Manifest JSON</label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleManifestChange}
              style={{ ...inputStyle, borderColor: manifestErrors.length ? 'var(--color-danger)' : 'var(--color-accent)' }}
              disabled={saving}
            />
            {manifestFile && !checking && manifestErrors.length === 0 && (
              <p style={{ color: 'var(--color-accent)', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>✓ Manifest looks valid.</p>
            )}
            {manifestErrors.length > 0 && (
              <div style={{ marginTop: '-10px', marginBottom: '15px' }}>
                {manifestErrors.map((msg, i) => (
                  <p key={i} style={{ color: 'var(--color-danger)', fontSize: '0.85rem', margin: '2px 0' }}>✗ {msg}</p>
                ))}
              </div>
            )}

            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-accent)', fontWeight: 'bold' }}>Guide (.md)</label>
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              onChange={handleGuideChange}
              style={{ ...inputStyle, borderColor: guideError ? 'var(--color-danger)' : 'var(--color-accent)' }}
              disabled={saving}
            />
            {guideError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>✗ {guideError}</p>}

            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-accent)', fontWeight: 'bold' }}>Cover Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              style={{ ...inputStyle, borderColor: coverError ? 'var(--color-danger)' : 'var(--color-accent)' }}
              disabled={saving}
            />
            {coverError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>✗ {coverError}</p>}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-10px', marginBottom: '15px' }}>
              Remote tools are registered from an admin-authored manifest, guide, and cover — the tool's own URL (<code>deployment.tool_url</code>) is stored only as internal deployment metadata and is never used as the public launch link. <code>/api/manifest</code> on the tool itself is optional. The guide syncs as a draft; publish it separately from the SEO tab.
            </p>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-accent)', fontWeight: 'bold' }}>Select ZIP File (Folder Product)</label>
            <input 
              type="file" 
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files[0])} 
              style={{ ...inputStyle, borderColor: 'var(--color-accent)' }} 
              disabled={saving}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-10px', marginBottom: '15px' }}>
              ZIP must contain a valid manifest.json, cover image, guide, and content files.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving || checking || !remoteReady}>
            {saving ? 'Syncing...' : 'Sync & Publish'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
        {syncType === 'remote' && !remoteReady && !checking && (manifestFile || guideFile || coverFile) && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
            Fix the errors above and select all three files to enable Sync.
          </p>
        )}
      </form>
    </div>
  );
}
