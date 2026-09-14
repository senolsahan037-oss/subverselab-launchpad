const crypto = require('crypto');
const admin = require('firebase-admin');

// Mirrors uploadToStorage() in
// Infrastructure/MetadataSync/metadata-sync-service/server.js:181 —
// file.makePublic() (a bucket ACL call) fails on this bucket because
// Uniform Bucket-Level Access rejects per-object ACL changes.
// firebaseStorageDownloadTokens is the same token-gated public URL
// mechanism the Firebase client SDK's getDownloadURL() relies on, and it
// works under UBLA without touching bucket-wide IAM.
async function uploadToStorage(buffer, contentType, destPath) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(destPath);
  const token = crypto.randomUUID();
  await file.save(buffer, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
}

// Used by the YouTube publisher to stream the source file directly from
// Storage instead of re-fetching its own public URL over HTTP.
function getStorageReadStream(destPath) {
  const bucket = admin.storage().bucket();
  return bucket.file(destPath).createReadStream();
}

module.exports = { uploadToStorage, getStorageReadStream };
