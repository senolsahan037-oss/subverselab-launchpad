// The admin panel's calls to the live catalogue API (api/server.js /api/admin/catalog/*). Every call carries the signed-in
// admin's Firebase ID token; under the local preview (src/devPreview.js) the token is 'dev-preview', which only a local API
// started with SVL_DEV_ADMIN=1 accepts.
import { apiUrl } from '../../utils/endpoints';

async function token(user) {
  return user?.getIdToken ? user.getIdToken() : '';
}

export async function catalogGet(user, path = '/api/admin/catalog') {
  const r = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${await token(user)}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}

export async function catalogPost(user, path, body) {
  const r = await fetch(apiUrl(path), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token(user)}` }, body: JSON.stringify(body || {}),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(out.error || `HTTP ${r.status}`); e.errors = out.errors; e.code = out.code; throw e; }
  return out;
}

// PUT one file with progress (0..1): to a signed bucket URL, or to the API itself (then the answer is JSON).
export function putFile(url, headers, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    for (const [k, v] of Object.entries(headers || {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { body = null; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body?.error || `upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('upload failed (network)'));
    xhr.send(file);
  });
}

const q = (o) => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

// Picture, audio or PDF -> a public URL (Firebase Storage, catalog/<kind>/<slug>/...). Always through the API (small files).
export async function uploadMedia(user, { kind, file, group, slug, onProgress }) {
  const t = await token(user);
  return putFile(apiUrl(`/api/admin/catalog/media?${q({ kind, filename: file.name, group, slug })}`), { Authorization: `Bearer ${t}`, 'Content-Type': file.type || 'application/octet-stream' }, file, onProgress);
}

// A sold file (zip / pkg / dmg) -> the private downloads bucket + plugins/manifest.json. A signed bucket URL when the API
// can sign one (Cloud Run); otherwise through the API itself.
export async function uploadSoldFile(user, { slug, version, platform, file, onProgress }) {
  let objectPath;
  let u = null;
  try { u = await catalogPost(user, '/api/admin/catalog/file', { slug, version, filename: file.name }); } catch (err) { if (err.code !== 'cannot-sign') throw err; }
  if (u?.uploadUrl) {
    await putFile(u.uploadUrl, u.headers, file, onProgress);
    objectPath = u.objectPath;
  } else {
    const t = await token(user);
    const out = await putFile(apiUrl(`/api/admin/catalog/file/direct?${q({ slug, version, filename: file.name })}`), { Authorization: `Bearer ${t}`, 'Content-Type': 'application/octet-stream' }, file, onProgress);
    objectPath = out.objectPath;
  }
  return catalogPost(user, '/api/admin/catalog/file/publish', { slug, platform, version, objectPath });
}

export const formatBytes = (n) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};
