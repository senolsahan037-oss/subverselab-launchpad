// The live catalogue (owner 2026-10-31): news, plug-ins, sample packs and preset packs added from /admin, kept in
// Firestore (catalog_news, catalog_plugins, catalog_sample_packs, catalog_preset_packs; Admin SDK only, see
// firestore.rules) and served to the pages by GET /api/catalog. Nothing here is a page: the site lays the catalogue over
// its hand-written data (src/catalog/catalog.js); here the new slugs are registered with the entitlements
// (registerCatalogProducts) so orders, download tickets, the manifest and the sweeps know them without a deploy.
//
// Files: pictures, preview audio and manual PDFs go to the Firebase Storage bucket under catalog/<kind>/<slug>/ (the
// same bucket the product covers already use; served with a download token, no rule change), sold zips and installers
// go to the private downloads bucket under plugins/<slug>/<version>/ and into plugins/manifest.json, exactly as
// subverselab-plugin-common/tools/publish_download.sh writes them.
import { randomUUID } from 'node:crypto';
import { COLLECTIONS, KINDS, cleanDoc, liveAt } from './catalogSchema.js';
import { registerCatalogProducts } from './entitlements.js';

export { KINDS, COLLECTIONS };

const CACHE_MS = 60_000;
const MEDIA_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'project-62238635-aae4-41f4-880.firebasestorage.app';
const DOWNLOADS_BUCKET = process.env.SVL_DOWNLOADS_BUCKET || 'subverselab-downloads';
const UPLOAD_URL_SECONDS = 15 * 60;

// Media uploads (public, through the Firebase download token): type by extension, size caps.
export const MEDIA_KINDS = {
  image: { types: { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' }, max: 25 * 1024 * 1024 },
  audio: { types: { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg' }, max: 60 * 1024 * 1024 },
  pdf: { types: { '.pdf': 'application/pdf' }, max: 80 * 1024 * 1024 },
  json: { types: { '.json': 'application/json' }, max: 2 * 1024 * 1024 },   // preview waveform peaks (scripts/pack-peaks.js / the panel)
};
// Sold files (private downloads bucket): the same kinds publish_download.sh accepts.
export const FILE_PLATFORMS = ['mac', 'win', 'zip'];
export const FILE_TYPES = { '.pkg': 'application/octet-stream', '.zip': 'application/zip', '.dmg': 'application/x-apple-diskimage' };
export const FILE_MAX = 1.5 * 1024 * 1024 * 1024;

const cannotSign = (err) => /client_email|sign data|signBlob|private key|credentials/i.test(String(err?.message || ''));
const ext = (name) => (String(name).toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];
export const safeFilename = (name) => String(name || '').split(/[\\/]/).pop().replace(/[^A-Za-z0-9._+-]+/g, '-').replace(/^[.-]+/, '').slice(-120);

export function createCatalogService({ getAdmin, getStorage, now = () => Date.now() }) {
  let cache = { at: 0, value: null, loading: null };
  const empty = () => ({ news: [], plugins: [], samplePacks: [], presetPacks: [], publishers: [] });

  async function readAll(admin) {
    const out = empty();
    await Promise.all(KINDS.map(async (kind) => {
      const snap = await admin.db.collection(COLLECTIONS[kind]).get();
      out[kind] = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }));
    return out;
  }

  // Registers the catalogue's products with the entitlements and refreshes the Lemon Squeezy id -> slug map.
  const lsMap = new Map();
  function apply(cat) {
    registerCatalogProducts({
      samplePacks: cat.samplePacks.filter((p) => p.published !== false).map((p) => ({ slug: p.id, listedAt: p.listedAt })),
      presetPacks: cat.presetPacks.filter((p) => p.published !== false).map((p) => ({ slug: p.id, listedAt: p.listedAt, free: Boolean(p.free) })),
      plugins: cat.plugins.filter((p) => p.published !== false).map((p) => ({ slug: p.id, free: Boolean(p.free) })),
    });
    lsMap.clear();
    for (const kind of ['plugins', 'samplePacks', 'presetPacks']) for (const p of cat[kind]) if (p.lsProductId) lsMap.set(String(p.lsProductId), p.id);
  }

  // The whole catalogue (published or not), cached a minute per instance. Never throws: without Firestore (local
  // preview, an outage) it answers the last good copy or an empty one, so a page or a webhook is never blocked by it.
  async function load({ force = false } = {}) {
    if (!force && cache.value && now() - cache.at < CACHE_MS) return cache.value;
    if (cache.loading) return cache.loading;
    cache.loading = (async () => {
      try {
        const admin = await getAdmin();
        const value = await readAll(admin);
        apply(value);
        cache = { at: now(), value, loading: null };
        return value;
      } catch (err) {
        console.error('catalog load:', err.message);
        cache.loading = null;
        if (!cache.value) cache = { at: now(), value: empty(), loading: null };
        return cache.value;
      }
    })();
    return cache.loading;
  }
  const invalidate = () => { cache.at = 0; };

  // What the pages read: published items only, no Lemon Squeezy product ids, no publisher e-mail addresses.
  function publicView(cat, at = now()) {
    const strip = (d) => { const { lsProductId, email, ...rest } = d; void lsProductId; void email; return rest; };
    return {
      news: cat.news.filter((d) => liveAt(d, at)).map(strip),
      plugins: cat.plugins.filter((d) => liveAt(d, at)).map(strip),
      samplePacks: cat.samplePacks.filter((d) => liveAt(d, at)).map(strip),
      presetPacks: cat.presetPacks.filter((d) => liveAt(d, at)).map(strip),
      publishers: (cat.publishers || []).filter((d) => liveAt(d, at)).map(strip),
    };
  }
  // The slugs the site server needs for its routes (a /plugins/<slug> or /sample-packs/<slug> that is not prerendered).
  const slugs = (cat, at = now()) => ({
    plugins: cat.plugins.filter((d) => liveAt(d, at)).map((d) => d.id),
    samplePacks: cat.samplePacks.filter((d) => liveAt(d, at)).map((d) => d.id),
  });

  const slugFor = (productId) => lsMap.get(String(productId)) || null;

  async function save(kind, input) {
    if (!KINDS.includes(kind)) return { error: 'unknown kind', status: 400 };
    const { doc, errors } = cleanDoc(kind, input);
    if (errors.length) return { error: errors.join('; '), errors, status: 400 };
    const admin = await getAdmin();
    const ref = admin.db.collection(COLLECTIONS[kind]).doc(doc.id);
    const before = await ref.get();
    const stamp = new Date(now()).toISOString();
    const data = { ...doc, updatedAt: stamp, ...(before.exists ? { createdAt: before.data().createdAt || stamp } : { createdAt: stamp }) };
    delete data.id;
    await ref.set(data);
    invalidate();
    await load({ force: true });
    return { ok: true, id: doc.id, doc: { ...data, id: doc.id } };
  }

  async function remove(kind, id) {
    if (!KINDS.includes(kind) || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(String(id || ''))) return { error: 'unknown item', status: 400 };
    const admin = await getAdmin();
    await admin.db.collection(COLLECTIONS[kind]).doc(id).delete();
    invalidate();
    await load({ force: true });
    return { ok: true, id };
  }

  // ---- Media (Firebase Storage, public through a download token) -------------------------------------------------------
  async function mediaUploadUrl({ kind, filename, group, slug }) {
    const spec = MEDIA_KINDS[kind];
    if (!spec) return { error: 'kind is image, audio or pdf', status: 400 };
    const safe = safeFilename(filename);
    const e = ext(safe);
    if (!safe || !(e in spec.types)) return { error: `Allowed file types: ${Object.keys(spec.types).join(', ')}`, status: 400 };
    const g = KINDS.includes(group) ? group : 'misc';
    const s = /^[a-z0-9][a-z0-9-]{0,59}$/.test(String(slug || '')) ? slug : 'shared';
    const objectPath = `catalog/${g}/${s}/${Date.now().toString(36)}-${safe}`;
    const contentType = spec.types[e];
    const headers = { 'Content-Type': contentType, 'x-goog-content-length-range': `0,${spec.max}` };
    const storage = await getStorage();
    let uploadUrl;
    try {
      [uploadUrl] = await storage.bucket(MEDIA_BUCKET).file(objectPath).getSignedUrl({
        version: 'v4', action: 'write', expires: now() + UPLOAD_URL_SECONDS * 1000, contentType, extensionHeaders: { 'x-goog-content-length-range': headers['x-goog-content-length-range'] },
      });
    } catch (err) { if (cannotSign(err)) return { error: 'This API cannot sign upload addresses here; use the direct upload', status: 501, code: 'cannot-sign' }; throw err; }
    return { uploadUrl, headers, objectPath, expiresIn: UPLOAD_URL_SECONDS, maxBytes: spec.max };
  }
  // The same file through the API itself (the body is streamed to the bucket): for a machine whose credentials cannot sign
  // URLs (a developer's user credentials), and for every picture, preview and PDF (small files; Cloud Run takes up to 32 MB
  // in one request). Returns what mediaComplete returns.
  async function mediaDirect({ kind, filename, group, slug, body, contentType: given }) {
    const spec = MEDIA_KINDS[kind];
    if (!spec) return { error: 'kind is image, audio or pdf', status: 400 };
    const safe = safeFilename(filename);
    const e = ext(safe);
    if (!safe || !(e in spec.types)) return { error: `Allowed file types: ${Object.keys(spec.types).join(', ')}`, status: 400 };
    if (!Buffer.isBuffer(body) || !body.length) return { error: 'No file in the request', status: 400 };
    if (body.length > spec.max) return { error: `At most ${Math.round(spec.max / 1024 / 1024)} MB for ${kind}`, status: 413 };
    const g = KINDS.includes(group) ? group : 'misc';
    const s = /^[a-z0-9][a-z0-9-]{0,59}$/.test(String(slug || '')) ? slug : 'shared';
    const objectPath = `catalog/${g}/${s}/${Date.now().toString(36)}-${safe}`;
    const token = randomUUID();
    const storage = await getStorage();
    await storage.bucket(MEDIA_BUCKET).file(objectPath).save(body, { contentType: spec.types[e] || given, resumable: false, metadata: { cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token } } });
    const url = `https://firebasestorage.googleapis.com/v0/b/${MEDIA_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    return { ok: true, url, size: body.length, contentType: spec.types[e], objectPath };
  }
  // After the PUT: a download token on the object makes it readable at a fixed https URL (the CSP already allows the host).
  async function mediaComplete({ objectPath }) {
    if (typeof objectPath !== 'string' || !objectPath.startsWith('catalog/') || objectPath.includes('..')) return { error: 'That is not an uploaded catalogue file', status: 400 };
    const storage = await getStorage();
    const file = storage.bucket(MEDIA_BUCKET).file(objectPath);
    let meta;
    try { [meta] = await file.getMetadata(); } catch (err) { if (/No such object|404|not found/i.test(err.message) || err.code === 404) return { error: 'No file arrived at that path yet', status: 404 }; throw err; }
    const size = Number(meta.size);
    if (!Number.isFinite(size) || size <= 0) return { error: 'No file arrived at that path yet', status: 404 };
    const token = meta.metadata?.firebaseStorageDownloadTokens || randomUUID();
    await file.setMetadata({ cacheControl: 'public, max-age=31536000, immutable', metadata: { ...(meta.metadata || {}), firebaseStorageDownloadTokens: token } });
    const url = `https://firebasestorage.googleapis.com/v0/b/${MEDIA_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    return { ok: true, url, size, contentType: meta.contentType || null, objectPath };
  }

  // ---- Sold files (private downloads bucket + manifest) -----------------------------------------------------------------
  const versionOk = (v) => /^[0-9A-Za-z._-]{1,40}$/.test(String(v || ''));
  async function fileUploadUrl({ slug, version, filename }) {
    if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(String(slug || ''))) return { error: 'slug: lowercase letters, digits, - or _', status: 400 };
    if (!versionOk(version)) return { error: 'version like 1.0.0', status: 400 };
    const safe = safeFilename(filename);
    const e = ext(safe);
    if (!safe || !(e in FILE_TYPES)) return { error: `Allowed file types: ${Object.keys(FILE_TYPES).join(', ')}`, status: 400 };
    const objectPath = `plugins/${slug}/${version}/${safe}`;
    const contentType = FILE_TYPES[e];
    const headers = { 'Content-Type': contentType, 'x-goog-content-length-range': `0,${FILE_MAX}` };
    const storage = await getStorage();
    let uploadUrl;
    try {
      [uploadUrl] = await storage.bucket(DOWNLOADS_BUCKET).file(objectPath).getSignedUrl({
        version: 'v4', action: 'write', expires: now() + UPLOAD_URL_SECONDS * 1000, contentType, extensionHeaders: { 'x-goog-content-length-range': headers['x-goog-content-length-range'] },
      });
    } catch (err) { if (cannotSign(err)) return { error: 'This API cannot sign upload addresses here; use the direct upload', status: 501, code: 'cannot-sign' }; throw err; }
    return { uploadUrl, headers, objectPath, expiresIn: UPLOAD_URL_SECONDS, maxBytes: FILE_MAX };
  }
  // A sold file through the API itself (no signed URL): the body goes to plugins/<slug>/<version>/<name>. Then publishFile.
  async function fileDirect({ slug, version, filename, body }) {
    if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(String(slug || ''))) return { error: 'slug: lowercase letters, digits, - or _', status: 400 };
    if (!versionOk(version)) return { error: 'version like 1.0.0', status: 400 };
    const safe = safeFilename(filename);
    const e = ext(safe);
    if (!safe || !(e in FILE_TYPES)) return { error: `Allowed file types: ${Object.keys(FILE_TYPES).join(', ')}`, status: 400 };
    if (!Buffer.isBuffer(body) || !body.length) return { error: 'No file in the request', status: 400 };
    if (body.length > FILE_MAX) return { error: 'The file is larger than allowed', status: 413 };
    const objectPath = `plugins/${slug}/${version}/${safe}`;
    const storage = await getStorage();
    await storage.bucket(DOWNLOADS_BUCKET).file(objectPath).save(body, { contentType: FILE_TYPES[e], resumable: false, metadata: { cacheControl: 'public, max-age=31536000, immutable', contentDisposition: `attachment; filename="${safe}"` } });
    return { ok: true, objectPath, size: body.length };
  }
  // Points plugins/manifest.json at an uploaded file, as publish_download.sh does: entry.files[platform] = {url, size,
  // name, version, object}, entry.version = version. Returns the manifest entry.
  async function publishFile({ slug, platform, version, objectPath }) {
    if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(String(slug || ''))) return { error: 'slug: lowercase letters, digits, - or _', status: 400 };
    if (!FILE_PLATFORMS.includes(platform)) return { error: 'platform is mac, win or zip', status: 400 };
    if (!versionOk(version)) return { error: 'version like 1.0.0', status: 400 };
    const expected = `plugins/${slug}/${version}/`;
    if (typeof objectPath !== 'string' || !objectPath.startsWith(expected) || objectPath.includes('..') || objectPath.split('/').length !== 4) return { error: 'objectPath must be the uploaded file of this slug and version', status: 400 };
    const storage = await getStorage();
    const bucket = storage.bucket(DOWNLOADS_BUCKET);
    const file = bucket.file(objectPath);
    let meta;
    try { [meta] = await file.getMetadata(); } catch (err) { if (/No such object|404|not found/i.test(err.message) || err.code === 404) return { error: 'No file arrived at that path yet', status: 404 }; throw err; }
    const size = Number(meta.size);
    if (!Number.isFinite(size) || size <= 0) return { error: 'No file arrived at that path yet', status: 404 };
    const name = objectPath.split('/').pop();
    await file.setMetadata({ cacheControl: 'public, max-age=31536000, immutable', contentDisposition: `attachment; filename="${name}"` });
    const manifestFile = bucket.file('plugins/manifest.json');
    let manifest = {};
    try { const [buf] = await manifestFile.download(); manifest = JSON.parse(buf.toString('utf8')); } catch { manifest = {}; }
    const entry = manifest[slug] || { version: null, files: {} };
    entry.files = entry.files || {};
    entry.files[platform] = { url: `https://storage.googleapis.com/${DOWNLOADS_BUCKET}/${objectPath}`, size, name, version, object: objectPath };
    entry.version = version;
    manifest[slug] = entry;
    const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
    await manifestFile.save(JSON.stringify(sorted, null, 2), { contentType: 'application/json', metadata: { cacheControl: 'no-cache, max-age=0' } });
    return { ok: true, slug, platform, version, entry };
  }
  async function removeFile({ slug, platform }) {
    if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(String(slug || ''))) return { error: 'bad slug', status: 400 };
    const storage = await getStorage();
    const manifestFile = storage.bucket(DOWNLOADS_BUCKET).file('plugins/manifest.json');
    let manifest = {};
    try { const [buf] = await manifestFile.download(); manifest = JSON.parse(buf.toString('utf8')); } catch { manifest = {}; }
    if (platform) { if (manifest[slug]?.files) delete manifest[slug].files[platform]; if (manifest[slug] && !Object.keys(manifest[slug].files || {}).length) manifest[slug].version = null; } else delete manifest[slug];
    await manifestFile.save(JSON.stringify(manifest, null, 2), { contentType: 'application/json', metadata: { cacheControl: 'no-cache, max-age=0' } });
    return { ok: true, slug, platform: platform || null };
  }

  return { load, invalidate, publicView, slugs, slugFor, save, remove, mediaUploadUrl, mediaComplete, mediaDirect, fileUploadUrl, fileDirect, publishFile, removeFile, cleanDoc };
}
