const { getInstagramConfig } = require('../tokens');

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS_IMAGE = 6;   // images finish near-instantly, but not guaranteed
const MAX_POLL_ATTEMPTS_VIDEO = 24;  // ~2 minutes, Reels need real transcoding time

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphRequest(pathAndQuery, { method = 'GET', body } = {}) {
  const res = await fetch(`${GRAPH_API_BASE}${pathAndQuery}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    const message = json.error ? json.error.message : `HTTP ${res.status}`;
    throw new Error(`Instagram Graph API error: ${message}`);
  }
  return json;
}

// Video containers (and occasionally image containers) start IN_PROGRESS.
// Publishing before status_code reaches FINISHED fails outright — this is
// the "draft" window Instagram gives us, not something to skip.
async function waitForContainerReady(containerId, accessToken, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await graphRequest(`/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`);
    if (status.status_code === 'FINISHED') return;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(`Instagram media container failed: ${status.status_code}`);
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error('Instagram media container did not finish processing in time');
}

async function publishContainer(igBusinessAccountId, containerId, accessToken) {
  const result = await graphRequest(`/${igBusinessAccountId}/media_publish`, {
    method: 'POST',
    body: { creation_id: containerId, access_token: accessToken }
  });
  return result.id;
}

async function getPermalink(mediaId, accessToken) {
  const result = await graphRequest(`/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`);
  return result.permalink;
}

async function requireConfig() {
  const config = await getInstagramConfig();
  if (!config || !config.longLivedPageToken || !config.igBusinessAccountId) {
    throw new Error('Instagram is not configured (missing social_publish_config/instagram doc — run Scripts/social-publish-oauth-setup.js)');
  }
  return config;
}

async function publishImage(draft) {
  const { longLivedPageToken: accessToken, igBusinessAccountId } = await requireConfig();

  // Graph API reliably accepts JPEG for feed photos; PNG support is
  // unofficial. Surfacing this as a warning rather than a hard failure,
  // since Meta may still accept it.
  if (draft.sourceContentType && draft.sourceContentType !== 'image/jpeg') {
    console.warn(`Instagram feed photos reliably support JPEG only; got ${draft.sourceContentType}`);
  }

  const container = await graphRequest(`/${igBusinessAccountId}/media`, {
    method: 'POST',
    body: {
      image_url: draft.sourceUrl,
      caption: draft.content.instagram.caption,
      access_token: accessToken
    }
  });

  await waitForContainerReady(container.id, accessToken, MAX_POLL_ATTEMPTS_IMAGE);
  const mediaId = await publishContainer(igBusinessAccountId, container.id, accessToken);
  const permalink = await getPermalink(mediaId, accessToken);
  return { mediaId, permalink, containerId: container.id };
}

async function publishReel(draft) {
  const { longLivedPageToken: accessToken, igBusinessAccountId } = await requireConfig();

  const container = await graphRequest(`/${igBusinessAccountId}/media`, {
    method: 'POST',
    body: {
      media_type: 'REELS',
      video_url: draft.sourceUrl,
      caption: draft.content.instagram.caption,
      access_token: accessToken
    }
  });

  await waitForContainerReady(container.id, accessToken, MAX_POLL_ATTEMPTS_VIDEO);
  const mediaId = await publishContainer(igBusinessAccountId, container.id, accessToken);
  const permalink = await getPermalink(mediaId, accessToken);
  return { mediaId, permalink, containerId: container.id };
}

module.exports = { publishImage, publishReel };
