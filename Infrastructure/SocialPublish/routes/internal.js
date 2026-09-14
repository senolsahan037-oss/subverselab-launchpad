const express = require('express');
const { verifyCronSecret } = require('../lib/auth');
const draftsRepo = require('../lib/draftsRepo');
const { publishDraft } = require('../lib/publish');

const router = express.Router();

const MAX_CONCURRENT = 3;

async function runWithConcurrencyLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Cloud Scheduler target — publishes anything whose scheduledFor time has
// passed. Uses the same publishDraft()/lockForPublishing() path as the
// manual "approve" endpoint, so a manual click and a scheduled run can never
// double-publish the same draft.
router.post('/run-scheduled-publish', verifyCronSecret, async (req, res) => {
  try {
    const due = await draftsRepo.listDuePublishable();
    let published = 0;
    let failed = 0;

    await runWithConcurrencyLimit(due, MAX_CONCURRENT, async (draft) => {
      try {
        const result = await publishDraft(draft.id);
        if (result.status === 'published') published++;
        else failed++;
      } catch (err) {
        failed++;
        console.error(`Scheduled publish failed for draft ${draft.id}: ${err.message}`);
      }
    });

    res.json({ processed: due.length, published, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
