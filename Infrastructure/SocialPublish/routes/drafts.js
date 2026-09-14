const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs/promises');
const crypto = require('crypto');
const { verifyAdmin } = require('../lib/auth');
const draftsRepo = require('../lib/draftsRepo');
const { routeTargets } = require('../lib/routing');
const { uploadToStorage } = require('../lib/storage');
const { publishDraft } = require('../lib/publish');

const router = express.Router();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(verifyAdmin);

function parseContentForMediaType(mediaType, contentRaw) {
  const content = typeof contentRaw === 'string' ? JSON.parse(contentRaw) : contentRaw;
  if (!content || !content.instagram || !content.instagram.caption) {
    throw new Error('content.instagram.caption is required');
  }
  if (mediaType === 'video' && (!content.youtube || !content.youtube.title)) {
    throw new Error('content.youtube.title is required for video drafts');
  }
  return content;
}

function transitionErrorStatus(err) {
  if (err.code === 'NOT_FOUND') return 404;
  if (err.code === 'NOT_PUBLISHABLE' || err.code === 'INVALID_TRANSITION') return 409;
  return 400;
}

// Intake by reference: content is already in Storage. This is the contract
// the future AI generation pipeline will use.
router.post('/', async (req, res) => {
  try {
    const { mediaType, sourceUrl, sourcePath, sourceContentType, content, scheduledFor } = req.body;
    if (!mediaType || !sourceUrl || !sourcePath) {
      return res.status(400).json({ error: 'mediaType, sourceUrl, sourcePath are required' });
    }
    const targetPlatforms = routeTargets(mediaType);
    const parsedContent = parseContentForMediaType(mediaType, content);
    const id = await draftsRepo.createDraft({
      mediaType, sourceUrl, sourcePath, sourceContentType, targetPlatforms, content: parsedContent, scheduledFor
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Intake by file upload — exists so this service is testable end-to-end
// before the content-generation pipeline exists.
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const mediaType = req.body.mediaType;
    if (mediaType !== 'image' && mediaType !== 'video') {
      return res.status(400).json({ error: 'mediaType must be "image" or "video"' });
    }
    const targetPlatforms = routeTargets(mediaType);
    const content = parseContentForMediaType(mediaType, req.body.content);

    const buffer = await fs.readFile(req.file.path);
    const originalExt = req.file.originalname.includes('.') ? req.file.originalname.split('.').pop() : null;
    const ext = originalExt || (mediaType === 'image' ? 'jpg' : 'mp4');
    const destPath = `social-publish/${crypto.randomUUID()}.${ext}`;
    const sourceUrl = await uploadToStorage(buffer, req.file.mimetype, destPath);
    await fs.unlink(req.file.path).catch(() => {});

    const id = await draftsRepo.createDraft({
      mediaType,
      sourceUrl,
      sourcePath: destPath,
      sourceContentType: req.file.mimetype,
      targetPlatforms,
      content,
      scheduledFor: req.body.scheduledFor
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const drafts = await draftsRepo.listDrafts({ status: req.query.status, limit });
  res.json({ drafts });
});

router.get('/:id', async (req, res) => {
  const draft = await draftsRepo.getDraft(req.params.id);
  if (!draft) return res.status(404).json({ error: 'Not found' });
  res.json(draft);
});

router.post('/:id/approve', async (req, res) => {
  try {
    const result = await publishDraft(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(transitionErrorStatus(err)).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    await draftsRepo.cancelDraft(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(transitionErrorStatus(err)).json({ error: err.message });
  }
});

router.post('/:id/schedule', async (req, res) => {
  try {
    if (!req.body.scheduledFor) return res.status(400).json({ error: 'scheduledFor is required' });
    await draftsRepo.scheduleDraft(req.params.id, req.body.scheduledFor);
    res.json({ ok: true });
  } catch (err) {
    res.status(transitionErrorStatus(err)).json({ error: err.message });
  }
});

router.post('/:id/unschedule', async (req, res) => {
  try {
    await draftsRepo.unscheduleDraft(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(transitionErrorStatus(err)).json({ error: err.message });
  }
});

module.exports = router;
