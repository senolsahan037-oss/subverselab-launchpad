const admin = require('firebase-admin');

// Same pattern as verifyAdmin in metadata-sync-service/server.js: Firebase
// ID token + the "admin: true" custom claim already used for that service's
// admin panel. No new auth system for this service.
//
// DEV_BYPASS_ADMIN_AUTH is a narrowly-scoped local-testing convenience: it
// only takes effect when NODE_ENV is explicitly "development" AND this flag
// is explicitly set, mirroring the existing isDev localhost-CORS pattern in
// metadata-sync-service. Cloud Run deploys never set NODE_ENV=development,
// so this can never activate in production.
async function verifyAdmin(req, res, next) {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_ADMIN_AUTH === 'true') {
    req.user = { uid: 'dev-user', admin: true };
    return next();
  }

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

function verifyCronSecret(req, res, next) {
  if (!process.env.CRON_SECRET) {
    console.error('FATAL ERROR: CRON_SECRET environment variable is required.');
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  const provided = req.headers['x-cron-secret'];
  if (!provided || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }
  next();
}

module.exports = { verifyAdmin, verifyCronSecret };
