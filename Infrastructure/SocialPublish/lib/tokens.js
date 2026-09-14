const { db, COLLECTIONS } = require('./firestore');

// Rotating platform tokens live in Firestore, not env.yaml, because they
// need to be replaced at runtime (Meta long-lived tokens expire ~every 60
// days) without a redeploy. Written once by Scripts/social-publish-oauth-setup.js.
async function getYoutubeConfig() {
  const snap = await db.collection(COLLECTIONS.CONFIG).doc('youtube').get();
  return snap.exists ? snap.data() : null;
}

async function getInstagramConfig() {
  const snap = await db.collection(COLLECTIONS.CONFIG).doc('instagram').get();
  return snap.exists ? snap.data() : null;
}

module.exports = { getYoutubeConfig, getInstagramConfig };
