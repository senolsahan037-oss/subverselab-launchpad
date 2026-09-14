const admin = require('firebase-admin');
const { db, COLLECTIONS } = require('./firestore');

const STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  PARTIALLY_PUBLISHED: 'partially_published',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

const queueCollection = () => db.collection(COLLECTIONS.QUEUE);

async function createDraft({ mediaType, sourceUrl, sourcePath, sourceContentType, targetPlatforms, content, scheduledFor }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const platforms = {};
  for (const p of targetPlatforms) {
    platforms[p] = { status: 'pending', attempts: 0 };
  }
  const doc = {
    mediaType,
    sourceUrl,
    sourcePath,
    sourceContentType: sourceContentType || null,
    targetPlatforms,
    content,
    status: scheduledFor ? STATUSES.SCHEDULED : STATUSES.DRAFT,
    scheduledFor: scheduledFor ? admin.firestore.Timestamp.fromDate(new Date(scheduledFor)) : null,
    platforms,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    publishedAt: null
  };
  const ref = await queueCollection().add(doc);
  return ref.id;
}

async function getDraft(id) {
  const snap = await queueCollection().doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function listDrafts({ status, limit } = {}) {
  let q = queueCollection();
  if (status) q = q.where('status', '==', status);
  q = q.orderBy('createdAt', 'desc').limit(limit || 50);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Requires a composite index (status ASC, scheduledFor ASC) — Firestore
// will log a console error containing a direct link to create it the first
// time this query runs against a real project if the index doesn't exist yet.
async function listDuePublishable(now = new Date()) {
  const snap = await queueCollection()
    .where('status', '==', STATUSES.SCHEDULED)
    .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(now))
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Atomically flips status to "publishing", only from an allowed source
// status. This is what prevents a manual approve and the scheduled runner
// from both publishing the same draft: neither Instagram's nor YouTube's
// publish call is idempotent, so a race here would create a duplicate live
// post, not just a duplicate Firestore write.
async function lockForPublishing(id) {
  const ref = queueCollection().doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Draft not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const data = snap.data();
    if (![STATUSES.DRAFT, STATUSES.SCHEDULED, STATUSES.FAILED].includes(data.status)) {
      const err = new Error(`Draft is not publishable from status "${data.status}"`);
      err.code = 'NOT_PUBLISHABLE';
      throw err;
    }
    tx.update(ref, {
      status: STATUSES.PUBLISHING,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id, ...data, status: STATUSES.PUBLISHING };
  });
}

async function completePublishing(id, { status, platforms, lastError }) {
  const ref = queueCollection().doc(id);
  const update = {
    status,
    platforms,
    lastError: lastError || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (status === STATUSES.PUBLISHED || status === STATUSES.PARTIALLY_PUBLISHED) {
    update.publishedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.update(update);
}

async function cancelDraft(id) {
  const ref = queueCollection().doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Draft not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const data = snap.data();
    if (![STATUSES.DRAFT, STATUSES.SCHEDULED].includes(data.status)) {
      const err = new Error(`Cannot cancel from status "${data.status}"`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
    tx.update(ref, { status: STATUSES.CANCELED, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
}

async function scheduleDraft(id, scheduledFor) {
  const ref = queueCollection().doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Draft not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const data = snap.data();
    if (![STATUSES.DRAFT, STATUSES.SCHEDULED, STATUSES.FAILED].includes(data.status)) {
      const err = new Error(`Cannot schedule from status "${data.status}"`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
    tx.update(ref, {
      status: STATUSES.SCHEDULED,
      scheduledFor: admin.firestore.Timestamp.fromDate(new Date(scheduledFor)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

async function unscheduleDraft(id) {
  const ref = queueCollection().doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Draft not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const data = snap.data();
    if (data.status !== STATUSES.SCHEDULED) {
      const err = new Error(`Cannot unschedule from status "${data.status}"`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
    tx.update(ref, { status: STATUSES.DRAFT, scheduledFor: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
}

module.exports = {
  STATUSES,
  createDraft,
  getDraft,
  listDrafts,
  listDuePublishable,
  lockForPublishing,
  completePublishing,
  cancelDraft,
  scheduleDraft,
  unscheduleDraft
};
