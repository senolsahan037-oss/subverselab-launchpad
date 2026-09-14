const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const path = require('path');

if (!process.env.FIREBASE_STORAGE_BUCKET) {
  console.error('FATAL ERROR: FIREBASE_STORAGE_BUCKET environment variable is required.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

// Required after admin.initializeApp() — lib/firestore.js calls
// admin.firestore() at module-load time.
const draftsRouter = require('./routes/drafts');
const internalRouter = require('./routes/internal');

const app = express();
app.use(express.json());

const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://subverselab.com', 'https://www.subverselab.com'];

if (isDev) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:8080');
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

const apiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req.user ? req.user.uid : req.ip),
  message: { error: 'Too Many Requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/drafts', apiRateLimiter, draftsRouter);
app.use('/internal', internalRouter);

// Public-safe values only (Firebase's client-side API key is not a secret)
// — lets the static review UI configure its Firebase Auth sign-in button
// without hardcoding project config into checked-in HTML.
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN || '',
    projectId: process.env.GOOGLE_CLOUD_PROJECT || ''
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Social Publish service running on port ${PORT}`));
