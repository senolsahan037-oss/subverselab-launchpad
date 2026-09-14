// Shared Firestore fetch used by both generate-sitemap.js and prerender.js —
// same published articles + public tools, read at build time. Both scripts
// need this exact data (nothing more), so it's factored out once rather than
// duplicated.
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const SITE_URL = 'https://subverselab.com';

export function loadEnv() {
  const envPath = join(ROOT, '.env');
  const env = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return env;
}

export function isoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  if (value._seconds) return new Date(value._seconds * 1000).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export async function fetchContent() {
  const env = loadEnv();
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  const articlesSnap = await getDocs(query(collection(db, 'seo_articles'), where('status', '==', 'published')));
  const articles = articlesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const productsSnap = await getDocs(collection(db, 'products'));
  const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return { articles, products };
}
