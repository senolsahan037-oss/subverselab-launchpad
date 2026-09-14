// Fake publisher used before real credentials exist, or for local testing
// (USE_STUB_PUBLISHERS=true). Lets the draft/approve/schedule state machine
// be verified end-to-end without touching Instagram or YouTube.
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishImage(draft) {
  await delay(300);
  return { mediaId: `stub-ig-${draft.id}`, permalink: `https://instagram.com/stub/${draft.id}` };
}

async function publishReel(draft) {
  await delay(300);
  return { mediaId: `stub-ig-${draft.id}`, permalink: `https://instagram.com/stub/reel/${draft.id}` };
}

async function publishVideo(draft) {
  await delay(300);
  return { videoId: `stub-yt-${draft.id}`, url: `https://youtu.be/stub-${draft.id}` };
}

module.exports = {
  instagram: { publishImage, publishReel },
  youtube: { publishVideo }
};
