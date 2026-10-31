// Local preview as the owner (owner 28 Oct 2026: "google ile açmak yerine geçici olarak lokal hostta bunları devre dışı
// bırakalım"). Loaded ONLY under `npm run dev` (main.jsx checks import.meta.env.DEV; the production build never includes it).
// http://localhost:5181/?devpreview=1 turns it on, ?devpreview=0 off (kept in localStorage). While on:
//   - the app sees a signed-in, verified owner account (no Google sign-in),
//   - every /api request carries x-svl-dev-preview: 1; the Vite dev server (vite.config.js) answers it from .devdata/
//     (answers copied once from the owner's real signed-in session) and passes anything it has no copy of to the live API.
// Nothing is written to the live API by the preview: POSTs with no saved answer get a 503 from the dev server.
import { auth } from './firebase';

const KEY = 'svlDevPreview';
const q = new URLSearchParams(window.location.search).get('devpreview');
try {
  if (q === '1') localStorage.setItem(KEY, '1');
  if (q === '0') localStorage.removeItem(KEY);
} catch { /* storage blocked: preview stays off */ }

let on = false;
try { on = localStorage.getItem(KEY) === '1'; } catch { on = false; }

if (on) {
  const user = {
    uid: 'dev-preview-owner',
    email: 'senolsahan037@gmail.com',
    emailVerified: true,
    displayName: 'Şenol Şahan (local preview)',
    photoURL: null,
    isAnonymous: false,
    providerId: 'firebase',
    providerData: [{ providerId: 'google.com', email: 'senolsahan037@gmail.com' }],
    metadata: { creationTime: '2026-09-01T00:00:00Z', lastSignInTime: new Date().toISOString() },
    getIdToken: async () => 'dev-preview',
    getIdTokenResult: async () => ({ token: 'dev-preview', claims: {} }),
    reload: async () => {},
  };
  // auth.currentUser stays the real one (null): Firestore reads it internally and asserts on a stand-in. The app takes the
  // user from onAuthStateChanged.
  auth.onAuthStateChanged = (next) => {
    const cb = typeof next === 'function' ? next : next?.next;
    setTimeout(() => cb?.(user), 0);
    return () => {};
  };
  // onIdTokenChanged is left alone: Firestore listens there and expects a real user (it reads as signed out).
  auth.signOut = async () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } window.location.reload(); };

  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.startsWith('/api/')) {
      const headers = new Headers(init.headers || {});
      headers.set('x-svl-dev-preview', '1');
      return realFetch(input, { ...init, headers });
    }
    return realFetch(input, init);
  };
  console.info('[dev preview] signed in as the owner (local only). ?devpreview=0 turns it off.');
}
