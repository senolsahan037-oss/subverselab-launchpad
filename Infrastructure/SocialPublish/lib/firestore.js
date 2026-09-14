const admin = require('firebase-admin');

const db = admin.firestore();

const COLLECTIONS = {
  QUEUE: 'social_publish_queue',
  CONFIG: 'social_publish_config'
};

module.exports = { db, COLLECTIONS };
