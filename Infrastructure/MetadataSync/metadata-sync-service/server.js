const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const sanitizeHtml = require('sanitize-html');
const dns = require('dns');
const { promisify } = require('util');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const os = require('os');

if (!process.env.FIREBASE_STORAGE_BUCKET) {
  console.error("FATAL ERROR: FIREBASE_STORAGE_BUCKET environment variable is required.");
  process.exit(1);
}

const app = express();
app.use(express.json());

const resolveDns = promisify(dns.lookup);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'subverselab',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});
const db = admin.firestore();
const storage = admin.storage();

// CORS
const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://subverselab.com', 'https://www.subverselab.com'];

if (isDev) {
  allowedOrigins.push('http://localhost:5173');
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// SSRF Protection Utilities
const PRIVATE_IP_BLOCKS = [
  /^(127\.)/, /^(10\.)/, /^(172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.)/,
  /^(192\.168\.)/, /^(169\.254\.)/, /^(0\.)/
];

async function isSafeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:' && !(isDev && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'))) {
      return false; // Must be HTTPS in prod
    }
    if (url.username || url.password) return false;
    const allowedDomains = process.env.ALLOWED_TOOL_DOMAINS 
      ? process.env.ALLOWED_TOOL_DOMAINS.split(',')
      : ['*.run.app', 'subverselab.com', '*.subverselab.com', 'youtube.com', 'youtu.be'];
    
    let domainAllowed = false;
    for (let d of allowedDomains) {
      d = d.trim();
      if (d.startsWith('*.')) {
        const base = d.substring(1);
        if (url.hostname.endsWith(base) || url.hostname === base.substring(1)) {
          domainAllowed = true;
          break;
        }
      } else {
        if (url.hostname === d) {
          domainAllowed = true;
          break;
        }
      }
    }
    if (isDev && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) domainAllowed = true;
    if (!domainAllowed) return false;

    // DNS Resolution check for IPv4
    if (url.hostname !== 'localhost') {
      const { address, family } = await resolveDns(url.hostname);
      if (family === 4) {
        for (const block of PRIVATE_IP_BLOCKS) {
          if (block.test(address)) return false;
        }
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

// Authentication Middleware
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.admin === true) {
      req.user = decodedToken;
      next();
    } else {
      return res.status(403).json({ error: 'Access denied: Requires admin privileges.' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Rate Limiter
const syncRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user ? req.user.uid : req.ip,
  message: { error: 'Too Many Requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// The Tool Room SSO bridge (POST /api/auth/tool-token, minting a Firebase
// custom token for the Tool Room iframe) does NOT live here. It briefly did,
// but this service runs in subverselab-project while the Firebase project is
// project-62238635-aae4-41f4-880 — a custom token signed by this service's
// identity is only ever trusted by Identity Toolkit for the project that
// identity belongs to, so every mint here "succeeded" (200) while every
// redemption in the tool failed with CREDENTIAL_MISMATCH. Attaching a
// service account from the other project, or minting a key for one, are both
// blocked by this org's policy (disableCrossProjectServiceAccountUsage,
// disableServiceAccountKeyCreation) — rightly so. The bridge now lives in
// Infrastructure/ToolAuthBridge, deployed natively into
// project-62238635-aae4-41f4-880, where its own identity is actually trusted.

const ALLOWED_CONTENT_TYPES = ['ai_tool', 'workflow', 'preset', 'pack', 'project', 'instrument_rack', 'midi_pack', 'sample_pack'];

function validateManifestSchema(manifest) {
  if (!manifest) throw new Error('Missing manifest');
  const required = ['name', 'slug', 'content_type', 'version', 'guide_version', 'updated_at', 'source_type', 'actions'];
  for (const f of required) {
    if (!manifest[f]) throw new Error(`Manifest missing required field: ${f}`);
  }
  if (!Array.isArray(manifest.actions)) {
    throw new Error('Manifest actions must be an array');
  }
  for (const action of manifest.actions) {
    if (!['launch', 'download', 'purchase', 'external'].includes(action.type)) {
      throw new Error(`Invalid action type: ${action.type}`);
    }
  }
  if (!ALLOWED_CONTENT_TYPES.includes(manifest.content_type)) {
    throw new Error(`Invalid content_type: ${manifest.content_type}`);
  }
  if (!manifest.hasOwnProperty('preview_audio_url') && !manifest.hasOwnProperty('preview_audio_path')) {
    throw new Error('Manifest missing preview_audio_url or preview_audio_path (can be null)');
  }
}

// file.makePublic() (a bucket ACL call) always fails on this bucket — Uniform
// Bucket-Level Access is enabled and locked, which rejects per-object ACL
// changes outright ("Cannot update access control ... when uniform
// bucket-level access is enabled"). A UBLA bucket can still serve a public
// download without touching bucket-wide IAM: Firebase's own
// firebaseStorageDownloadTokens object-metadata field produces a working
// token-gated public URL, the same mechanism the Firebase client SDK's
// getDownloadURL() relies on.
async function uploadToStorage(buffer, contentType, destPath) {
  const bucket = storage.bucket();
  const file = bucket.file(destPath);
  const token = crypto.randomUUID();
  await file.save(buffer, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
}

// Mechanically derives a short plain-text excerpt from already-verified,
// already-supplied guide content — never invents text. seo_articles'
// existing schema (ArticlePage.jsx, SEOAdminTab.jsx) reads `answer` as the
// article's short summary; without it the page still renders, just with a
// blank hero/meta description.
// Guides are Markdown, not HTML. Stripping only tags left every excerpt on the
// site starting with the literal text "## Overview" — and this field is both
// the article page's hero subtitle and its meta description, so that string was
// the first thing a search result showed for all six guides. The two passes
// below mirror firstProse()/stripMarkdown() in subverselab-v2's prerender and
// sitemap scripts, which already had to solve this for the same content.
function stripMarkdown(md = '') {
  return String(md)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\|.*$/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Skip the leading heading so a summary opens on real prose rather than on a
// section title that says nothing about the tool.
function firstProse(md = '') {
  for (const block of String(md).split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith('#') || t.startsWith('|') || /^-{3,}$/.test(t)) continue;
    return t;
  }
  return '';
}

function deriveExcerpt(source, maxLen = 200) {
  const text = stripMarkdown(firstProse(source)) || stripMarkdown(source);
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max upload
});

const ALLOWED_ACCESS_LEVELS = ['public', 'member'];

// Remote AI tools: manifest/guide/cover are supplied directly by whoever is
// registering the product. /api/manifest on the tool itself is optional and,
// when this path is used, is never fetched — nothing about this handler ever
// makes an outbound request to the tool. deployment.tool_url is registration
// metadata only: it is validated for safety (it will be rendered in an
// iframe on the live site) but never fetched from, and no content ZIP is
// ever created for a remote product.
// Rules/00_PLATFORM_INVARIANTS.md §5 grants the no-quota exception per product,
// by name. Adding a slug here is an explicit product decision, never a
// convenience while editing a manifest.
// Each approved slug carries its own list of productive operations, because
// every productive operation must be named as member-gated and no two tools
// have the same vocabulary — Sensei varies a pattern, SynthPulse evolves one.
// A single shared list would either reject a legitimate manifest or, worse,
// pass one that never declared its own gated paths.
const MEMBER_NO_PRODUCT_QUOTA_APPROVED = new Map([
  ['sensei', ['generate', 'variation', 'export']],
  ['synthpulse', ['generate', 'evolve', 'export']]
]);

// Names that describe a budget a user spends down. Their presence contradicts
// the policy outright.
const QUOTA_FIELDS = ['quota', 'quotas', 'credits', 'credit', 'daily_limit', 'monthly_limit', 'rate_limit', 'usage_limit', 'limits'];

// Names that would describe the Launchpad handing identity to another origin.
const TOKEN_FORWARDING_FIELDS = ['token_forwarding', 'forward_token', 'session_bridge', 'auth_bridge', 'pass_token'];

function validateRemoteToolManifest(manifest) {
  if (!manifest) throw new Error('Missing manifest');
  const required = ['slug', 'name', 'description', 'content_type', 'source_type', 'version', 'guide_version', 'deployment', 'access', 'actions'];
  for (const f of required) {
    if (!manifest[f]) throw new Error(`Manifest missing required field: ${f}`);
  }
  if (manifest.source_type !== 'remote') throw new Error('Expected source_type "remote"');
  if (!ALLOWED_CONTENT_TYPES.includes(manifest.content_type)) {
    throw new Error(`Invalid content_type: ${manifest.content_type}`);
  }

  if (typeof manifest.deployment !== 'object' || manifest.deployment === null) {
    throw new Error('deployment must be an object');
  }
  if (!manifest.deployment.provider) throw new Error('deployment.provider is required');
  if (!manifest.deployment.tool_url) throw new Error('deployment.tool_url is required');
  if (typeof manifest.deployment.iframe_compatible !== 'boolean') {
    throw new Error('deployment.iframe_compatible must be a boolean');
  }

  if (typeof manifest.access !== 'object' || manifest.access === null) {
    throw new Error('access must be an object');
  }
  if (!ALLOWED_ACCESS_LEVELS.includes(manifest.access.level)) {
    throw new Error(`Invalid access.level: ${manifest.access.level}`);
  }
  if (manifest.access.policy !== undefined) {
    // The approved-slug list lives here, not in the manifest: a product must
    // not be able to grant itself the exception. See Rules/00 §5.
    if (manifest.access.policy !== 'member_no_product_quota'
      || !MEMBER_NO_PRODUCT_QUOTA_APPROVED.has(manifest.slug)
      || manifest.access.level !== 'member') {
      throw new Error('member_no_product_quota is reserved for the member-gated sensei manifest');
    }

    // The policy is a contract, not a label. Each field below is one clause of
    // it, and a manifest that claims the policy without stating them has
    // declared nothing enforceable.
    // true or false, but stated. The policy says the shell *may* be public;
    // this check used to require that it *was*, which made the field a
    // formality instead of a declaration. A tool that carries a download gates
    // at the door and says so here; one that teaches opens and says that.
    if (typeof manifest.access.public_shell !== 'boolean') {
      throw new Error('member_no_product_quota requires access.public_shell to be stated as true or false');
    }
    if (manifest.access.self_authenticated !== true) {
      throw new Error('member_no_product_quota requires access.self_authenticated: true');
    }
    if (manifest.access.enforcement !== 'tool_server') {
      throw new Error('member_no_product_quota requires access.enforcement: "tool_server" — membership must be verified on the tool\'s own server, not by hiding UI');
    }
    if (!Array.isArray(manifest.access.member_required_for) || manifest.access.member_required_for.length === 0) {
      throw new Error('member_no_product_quota requires a non-empty access.member_required_for array naming the gated operations');
    }
    const gated = new Set(manifest.access.member_required_for);
    for (const op of MEMBER_NO_PRODUCT_QUOTA_APPROVED.get(manifest.slug)) {
      if (!gated.has(op)) {
        throw new Error(`member_no_product_quota requires "${op}" in access.member_required_for — every productive operation is member-only`);
      }
    }
  }

  // A manifest cannot both disclaim a quota and describe one. Checked whenever
  // the policy is present, at the top level and inside access, so "no quota"
  // and "5 per day" can never coexist and leave the reader to guess.
  if (manifest.access.policy !== undefined) {
    for (const source of [manifest, manifest.access]) {
      for (const field of QUOTA_FIELDS) {
        if (source[field] !== undefined) {
          throw new Error(`${field} must not appear in a member_no_product_quota manifest — the policy asserts there is no quota, credit, or counter`);
        }
      }
    }
  }

  // The invariant is global, so it is checked on every remote manifest rather
  // than only on self-authenticated ones: nothing may declare that the
  // Launchpad hands identity across the origin boundary.
  for (const source of [manifest, manifest.access, manifest.deployment]) {
    for (const field of TOKEN_FORWARDING_FIELDS) {
      if (source[field] !== undefined && source[field] !== false) {
        throw new Error(`${field} is forbidden — no auth token or session is forwarded from the Launchpad to a remote tool (Rules/03_VALIDATION.md)`);
      }
    }
  }

  if (!Array.isArray(manifest.actions) || manifest.actions.length === 0) {
    throw new Error('actions must be a non-empty array');
  }
  for (const action of manifest.actions) {
    if (!['launch', 'download', 'purchase', 'external'].includes(action.type)) {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (action.type === 'launch' && action.url) {
      throw new Error("launch actions must not carry a url — the public launch URL is /tools/:slug, derived from slug, never deployment.tool_url");
    }
  }
}

app.post('/api/admin/sync-remote-metadata', verifyAdmin, syncRateLimiter, upload.fields([
  { name: 'coverFile', maxCount: 1 },
  { name: 'guideFile', maxCount: 1 }
]), async (req, res) => {
  const coverFile = req.files?.coverFile?.[0];
  const guideFile = req.files?.guideFile?.[0];

  const cleanup = () => {
    if (coverFile) fs.unlink(coverFile.path, () => {});
    if (guideFile) fs.unlink(guideFile.path, () => {});
  };

  try {
    let manifest;
    try {
      manifest = JSON.parse(req.body.manifest);
    } catch (e) {
      cleanup();
      return res.status(400).json({ error: 'Invalid or missing manifest JSON.' });
    }

    try {
      validateRemoteToolManifest(manifest);
    } catch (e) {
      cleanup();
      return res.status(400).json({ error: e.message });
    }

    if (!(await isSafeUrl(manifest.deployment.tool_url))) {
      cleanup();
      return res.status(400).json({ error: 'deployment.tool_url failed safety validation.' });
    }

    if (!coverFile) {
      cleanup();
      return res.status(400).json({ error: 'coverFile is required.' });
    }
    if (!guideFile) {
      cleanup();
      return res.status(400).json({ error: 'guideFile is required.' });
    }

    const coverBuffer = fs.readFileSync(coverFile.path);
    const coverContentType = coverFile.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(coverContentType)) {
      cleanup();
      return res.status(400).json({ error: 'Unsupported cover image type.' });
    }

    let guideContent = fs.readFileSync(guideFile.path, 'utf8');
    if (!guideContent) {
      cleanup();
      return res.status(400).json({ error: 'Guide content is empty.' });
    }
    guideContent = sanitizeHtml(guideContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ]),
      allowedAttributes: { '*': ['class', 'id'], 'a': ['href', 'name', 'target'], 'img': ['src', 'alt', 'title'] }
    });

    const guideHash = crypto.createHash('sha256').update(guideContent).digest('hex');
    const coverHash = crypto.createHash('sha256').update(coverBuffer).digest('hex');
    const actionsHash = crypto.createHash('sha256').update(JSON.stringify(manifest.actions)).digest('hex');

    const productRef = db.collection('products').doc(manifest.slug);
    // Canonical documentation collection: seo_articles is what ArticlePage.jsx
    // (via seoService.js) and the admin SEO review tab already read — writing
    // here instead of a separate `articles` collection means synced guides are
    // actually discoverable, reviewable, and publishable through the existing
    // workflow, not invisible to it. See Rules/05_SYNC.md.
    const articleRef = db.collection('seo_articles').doc(manifest.slug);
    const [productSnap, articleSnap] = await Promise.all([productRef.get(), articleRef.get()]);

    let shouldUploadCover = true;
    let existingStatus = 'draft';

    if (productSnap.exists) {
      const data = productSnap.data();
      if (
        data.version === manifest.version &&
        data.guide_version === manifest.guide_version &&
        data.guideHash === guideHash &&
        data.coverHash === coverHash &&
        data.actionsHash === actionsHash &&
        data.content_type === manifest.content_type &&
        data.title === manifest.name &&
        data.slug === manifest.slug &&
        data.deployment?.tool_url === manifest.deployment.tool_url
      ) {
        cleanup();
        return res.json({ success: true, noOp: true, message: 'Metadata is already up to date.' });
      }
      shouldUploadCover = data.coverHash !== coverHash;
    }
    if (articleSnap.exists) existingStatus = articleSnap.data().status || 'draft';

    let storageCoverUrl = productSnap.exists ? productSnap.data().coverImage : null;
    if (shouldUploadCover) {
      const fileExt = coverContentType.split('/')[1];
      storageCoverUrl = await uploadToStorage(coverBuffer, coverContentType, `tools/${manifest.slug}/cover_${coverHash}.${fileExt}`);
    }

    try {
      await db.runTransaction(async (t) => {
        t.set(productRef, {
          title: manifest.name,
          slug: manifest.slug,
          description: manifest.description,
          content_type: manifest.content_type,
          displayCategory: manifest.displayCategory || manifest.content_type,
          source_type: 'remote',
          version: manifest.version,
          guide_version: manifest.guide_version,
          deployment: manifest.deployment,
          access: manifest.access,
          actions: manifest.actions,
          coverImage: storageCoverUrl,
          coverHash,
          guideHash,
          actionsHash,
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const needsReview = articleSnap.exists && existingStatus === 'published';
        t.set(articleRef, {
          title: manifest.name + ' Guide',
          slug: manifest.slug,
          type: 'blog',
          category: 'Guide',
          answer: deriveExcerpt(guideContent),
          body: guideContent,
          relatedProductId: manifest.slug,
          status: existingStatus,
          // Firestore's Admin SDK rejects `undefined` field values outright
          // (throws on write) rather than treating them as "omit this key",
          // so the false case must be a genuine absent key, not `undefined`.
          ...(needsReview ? { needsReview: true } : {}),
          // seo_articles' existing read paths (getSEOArticles, used by
          // "related guides" and the admin SEO tab) order by createdAt and
          // silently exclude documents missing it — set once, on creation
          // only, so a resync never resets it.
          ...(articleSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    } catch (txErr) {
      if (shouldUploadCover && storageCoverUrl) {
        await storage.bucket().file(`tools/${manifest.slug}/cover_${coverHash}.${coverContentType.split('/')[1]}`).delete().catch(()=>console.warn("Rollback failed"));
      }
      cleanup();
      throw txErr;
    }

    cleanup();
    res.json({ message: 'Metadata synced successfully.', slug: manifest.slug });

  } catch (error) {
    cleanup();
    console.error('Remote Sync Error:', error);
    res.status(500).json({ error: 'An error occurred during synchronization.' });
  }
});

function isSafePath(p) {
  if (p.includes('..') || path.isAbsolute(p)) return false;
  const normalized = path.normalize(p);
  if (normalized.startsWith('..')) return false;
  return true;
}

app.post('/api/admin/sync-folder-metadata', verifyAdmin, syncRateLimiter, upload.single('zipFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No zip file provided.' });

  try {
    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    let totalSize = 0;
    const MAX_EXTRACT_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    const MAX_FILES = 10000;
    
    if (zipEntries.length > MAX_FILES) throw new Error('Too many files in ZIP.');
    zipEntries.forEach(entry => {
      totalSize += entry.header.size;
      if (totalSize > MAX_EXTRACT_SIZE) throw new Error('Extracted size too large.');
      if (!isSafePath(entry.entryName)) throw new Error('Invalid path in ZIP.');
    });

    const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json' || e.entryName.endsWith('/manifest.json'));
    if (!manifestEntry) throw new Error('manifest.json not found in ZIP.');

    const manifestStr = zip.readAsText(manifestEntry);
    const manifest = JSON.parse(manifestStr);

    try {
      validateManifestSchema(manifest);
      if (manifest.source_type !== 'folder') throw new Error('Expected folder source_type');
      if (!manifest.cover_path || !manifest.guide_path || !manifest.content_path) throw new Error('Missing cover_path, guide_path, or content_path');
      if (!isSafePath(manifest.cover_path) || !isSafePath(manifest.guide_path) || !isSafePath(manifest.content_path)) {
        throw new Error('Invalid paths in manifest');
      }
      if (manifest.preview_audio_path && !isSafePath(manifest.preview_audio_path)) {
        throw new Error('Invalid preview_audio_path in manifest');
      }
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // Adjust paths if manifest was in a subfolder (e.g. root dir in zip)
    const basePath = path.dirname(manifestEntry.entryName);
    const getEntry = (p) => {
      const fullPath = basePath === '.' ? p : `${basePath}/${p}`;
      return zipEntries.find(e => e.entryName === fullPath);
    };

    const guideEntry = getEntry(manifest.guide_path);
    if (!guideEntry) throw new Error('Guide file not found in ZIP.');
    let guideContent = zip.readAsText(guideEntry);
    guideContent = sanitizeHtml(guideContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ]),
      allowedAttributes: { '*': ['class', 'id'], 'a': ['href', 'name', 'target'], 'img': ['src', 'alt', 'title'] }
    });

    const coverEntry = getEntry(manifest.cover_path);
    if (!coverEntry) throw new Error('Cover file not found in ZIP.');
    const coverBuffer = zip.readFile(coverEntry);
    const coverExt = path.extname(manifest.cover_path).toLowerCase();
    const coverContentType = coverExt === '.png' ? 'image/png' : coverExt === '.webp' ? 'image/webp' : 'image/jpeg';
    
    let previewBuffer = null;
    let previewContentType = null;
    let previewHash = null;
    if (manifest.preview_audio_path) {
      const previewEntry = getEntry(manifest.preview_audio_path);
      if (!previewEntry) throw new Error('Preview audio file not found in ZIP.');
      previewBuffer = zip.readFile(previewEntry);
      const ext = path.extname(manifest.preview_audio_path).toLowerCase();
      previewContentType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4';
      previewHash = crypto.createHash('sha256').update(previewBuffer).digest('hex');
    }

    const guideHash = crypto.createHash('sha256').update(guideContent).digest('hex');
    const coverHash = crypto.createHash('sha256').update(coverBuffer).digest('hex');
    const actionsHash = crypto.createHash('sha256').update(JSON.stringify(manifest.actions)).digest('hex');

    // Create a new zip containing ONLY the content_path
    const contentZip = new AdmZip();
    const contentPrefix = basePath === '.' ? manifest.content_path : `${basePath}/${manifest.content_path}`;
    let hasContent = false;
    
    zipEntries.forEach(entry => {
      if (entry.entryName.startsWith(contentPrefix) && !entry.isDirectory) {
        const relativeName = entry.entryName.substring(contentPrefix.length).replace(/^[\/\\]/, '');
        contentZip.addFile(relativeName, zip.readFile(entry));
        hasContent = true;
      }
    });
    
    if (!hasContent) throw new Error('Content path is empty or not found.');
    const contentZipBuffer = contentZip.toBuffer();
    const contentHash = crypto.createHash('sha256').update(contentZipBuffer).digest('hex');

    // Firestore Check
    const productRef = db.collection('products').doc(manifest.slug);
    // Canonical documentation collection: seo_articles is what ArticlePage.jsx
    // (via seoService.js) and the admin SEO review tab already read — writing
    // here instead of a separate `articles` collection means synced guides are
    // actually discoverable, reviewable, and publishable through the existing
    // workflow, not invisible to it. See Rules/05_SYNC.md.
    const articleRef = db.collection('seo_articles').doc(manifest.slug);
    const [productSnap, articleSnap] = await Promise.all([productRef.get(), articleRef.get()]);

    let shouldUploadCover = true;
    let shouldUploadPreview = !!previewBuffer;
    let shouldUploadContent = true;
    let existingStatus = 'draft';

    if (productSnap.exists) {
      const data = productSnap.data();
      if (
        data.version === manifest.version && 
        data.guide_version === manifest.guide_version && 
        data.updated_at === manifest.updated_at &&
        data.guideHash === guideHash &&
        data.coverHash === coverHash &&
        data.previewHash === previewHash &&
        data.contentHash === contentHash &&
        data.actionsHash === actionsHash &&
        data.content_type === manifest.content_type &&
        data.title === manifest.name &&
        data.slug === manifest.slug
      ) {
        fs.unlinkSync(zipPath); // cleanup
        return res.json({ success: true, noOp: true, message: 'Metadata is already up to date.' });
      }
      shouldUploadCover = data.coverHash !== coverHash;
      shouldUploadContent = data.contentHash !== contentHash;
      if (previewBuffer) {
        shouldUploadPreview = data.previewHash !== previewHash;
      }
    }
    if (articleSnap.exists) existingStatus = articleSnap.data().status || 'draft';

    // Uploads
    let storageCoverUrl = productSnap.exists ? productSnap.data().coverImage : null;
    let storagePreviewUrl = productSnap.exists ? productSnap.data().previewAudio : null;
    let storageContentUrl = productSnap.exists ? productSnap.data().downloadUrl : null;
    
    if (shouldUploadCover) {
      storageCoverUrl = await uploadToStorage(coverBuffer, coverContentType, `packs/${manifest.slug}/cover_${coverHash}${coverExt}`);
    }
    if (shouldUploadPreview && previewBuffer) {
      const pExt = path.extname(manifest.preview_audio_path);
      storagePreviewUrl = await uploadToStorage(previewBuffer, previewContentType, `packs/${manifest.slug}/preview_${previewHash}${pExt}`);
    } else if (!previewBuffer) {
      storagePreviewUrl = null;
    }
    if (shouldUploadContent) {
      storageContentUrl = await uploadToStorage(contentZipBuffer, 'application/zip', `packs/${manifest.slug}/content_${contentHash}.zip`);
    }

    const normalizedActions = manifest.actions.map(action => {
      if (action.type === 'download' && action.url === null) {
        return { ...action, url: storageContentUrl };
      }
      return action;
    });

    const previewObj = storagePreviewUrl ? { type: 'audio', storageUrl: storagePreviewUrl, hash: previewHash } : null;

    // Firestore Transaction
    try {
      await db.runTransaction(async (t) => {
        t.set(productRef, {
          title: manifest.name,
          slug: manifest.slug,
          content_type: manifest.content_type,
          displayCategory: manifest.displayCategory || manifest.content_type,
          version: manifest.version,
          guide_version: manifest.guide_version,
          actions: normalizedActions,
          coverImage: storageCoverUrl,
          preview: previewObj,
          coverHash,
          guideHash,
          previewHash,
          contentHash,
          actionsHash,
          updated_at: manifest.updated_at,
          source_type: 'folder',
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const needsReview = articleSnap.exists && existingStatus === 'published';
        t.set(articleRef, {
          title: manifest.name + ' Guide',
          slug: manifest.slug,
          type: 'blog',
          category: 'Guide',
          answer: deriveExcerpt(guideContent),
          body: guideContent,
          relatedProductId: manifest.slug,
          status: existingStatus,
          // Firestore's Admin SDK rejects `undefined` field values outright
          // (throws on write) rather than treating them as "omit this key",
          // so the false case must be a genuine absent key, not `undefined`.
          ...(needsReview ? { needsReview: true } : {}),
          // seo_articles' existing read paths (getSEOArticles, used by
          // "related guides" and the admin SEO tab) order by createdAt and
          // silently exclude documents missing it — set once, on creation
          // only, so a resync never resets it.
          ...(articleSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    } catch (txErr) {
      if (shouldUploadCover && storageCoverUrl) {
        await storage.bucket().file(`packs/${manifest.slug}/cover_${coverHash}${coverExt}`).delete().catch(()=>console.warn("Rollback failed"));
      }
      if (shouldUploadPreview && storagePreviewUrl) {
        await storage.bucket().file(`packs/${manifest.slug}/preview_${previewHash}${path.extname(manifest.preview_audio_path)}`).delete().catch(()=>console.warn("Rollback failed"));
      }
      if (shouldUploadContent && storageContentUrl) {
        await storage.bucket().file(`packs/${manifest.slug}/content_${contentHash}.zip`).delete().catch(()=>console.warn("Rollback failed"));
      }
      throw txErr;
    }

    fs.unlinkSync(zipPath); // cleanup
    res.json({ message: 'Metadata and files synced successfully.', slug: manifest.slug });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Folder Sync Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during synchronization.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Metadata Sync Service running on port ${PORT}`);
});
