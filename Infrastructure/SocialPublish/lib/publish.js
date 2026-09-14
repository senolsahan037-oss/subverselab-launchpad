const draftsRepo = require('./draftsRepo');

function getPublishers() {
  if (process.env.USE_STUB_PUBLISHERS === 'true') {
    return require('./publishers/stub');
  }
  return {
    instagram: require('./publishers/instagram'),
    youtube: require('./publishers/youtube')
  };
}

async function publishToInstagram(draft, publishers) {
  return draft.mediaType === 'image'
    ? publishers.instagram.publishImage(draft)
    : publishers.instagram.publishReel(draft);
}

async function publishToYoutube(draft, publishers) {
  return publishers.youtube.publishVideo(draft);
}

// The one orchestrator both the manual "approve" endpoint and the scheduled
// runner call. Locks the draft first (see draftsRepo.lockForPublishing),
// then fans out to every target platform concurrently — they're independent,
// so one platform failing must not block or roll back the other.
async function publishDraft(id) {
  const draft = await draftsRepo.lockForPublishing(id);
  const publishers = getPublishers();

  const outcomes = await Promise.all(
    draft.targetPlatforms.map(async (platform) => {
      try {
        const result = platform === 'instagram'
          ? await publishToInstagram(draft, publishers)
          : await publishToYoutube(draft, publishers);
        return { platform, ok: true, result };
      } catch (err) {
        return { platform, ok: false, error: err.message };
      }
    })
  );

  const platforms = { ...draft.platforms };
  let successCount = 0;
  let lastError = null;
  const attemptedAt = new Date().toISOString();

  for (const outcome of outcomes) {
    const prev = platforms[outcome.platform] || { attempts: 0 };
    if (outcome.ok) {
      successCount++;
      platforms[outcome.platform] = {
        ...prev,
        ...outcome.result,
        status: 'published',
        attempts: prev.attempts + 1,
        lastAttemptAt: attemptedAt
      };
    } else {
      lastError = outcome.error;
      platforms[outcome.platform] = {
        ...prev,
        status: 'failed',
        error: outcome.error,
        attempts: prev.attempts + 1,
        lastAttemptAt: attemptedAt
      };
    }
  }

  let status;
  if (successCount === outcomes.length) status = draftsRepo.STATUSES.PUBLISHED;
  else if (successCount === 0) status = draftsRepo.STATUSES.FAILED;
  else status = draftsRepo.STATUSES.PARTIALLY_PUBLISHED;

  await draftsRepo.completePublishing(id, { status, platforms, lastError });
  return { id, status, platforms };
}

module.exports = { publishDraft };
