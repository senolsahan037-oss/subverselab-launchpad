const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

// Deliberately its own tiny service, not a route on metadata-sync-service.
// metadata-sync-service runs in subverselab-project; a custom token it signs
// is trusted only by Identity Toolkit for the project its signing service
// account belongs to. This project's org policy blocks both attaching a
// cross-project service account to Cloud Run (constraints/
// iam.disableCrossProjectServiceAccountUsage) and creating a downloadable
// service account key (constraints/iam.disableServiceAccountKeyCreation) —
// so there's no way to sign as this Firebase project's identity from a
// service running in another project. Running natively in
// project-62238635-aae4-41f4-880 sidesteps that: Cloud Run's own metadata
// server hands this service its native identity, already trusted by this
// project's Identity Toolkit, no keys or cross-project grants involved.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'project-62238635-aae4-41f4-880'
});

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://subverselab.com', 'https://www.subverselab.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

async function verifySignedIn(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const toolTokenRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user ? req.user.uid : req.ip,
  message: { error: 'Too Many Requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tool Room SSO bridge: a remote tool lives on its own origin, so it never
// sees subverselab.com's Firebase session — the browser correctly isolates
// Auth state per origin. The parent page calls this for a short-lived
// Firebase custom token scoped to the already-signed-in user, then hands it
// to the tool's iframe via postMessage. The tool's own Firebase Auth SDK
// calls signInWithCustomToken() with it, producing a real, auto-refreshing
// session on the tool's own origin — same project, same uid, no second
// manual sign-in.
app.post('/api/auth/tool-token', verifySignedIn, toolTokenRateLimiter, async (req, res) => {
  try {
    const customToken = await admin.auth().createCustomToken(req.user.uid);
    res.json({ customToken });
  } catch (error) {
    console.error('Failed to mint tool token:', error);
    res.status(500).json({ error: 'Could not mint tool token.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Tool Auth Bridge running on port ${PORT}`));
