/**
 * SEO Articles Service — Firestore CRUD + in-memory cache
 */
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'seo_articles';

/* ────────────────────────────────────────────────────────────
   Simple in-memory cache  (5 min TTL)
   ──────────────────────────────────────────────────────────── */
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { cache.delete(key); return null; }
  return entry.value;
}

function cacheInvalidate(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/* ────────────────────────────────────────────────────────────
   Converters
   ──────────────────────────────────────────────────────────── */
function toArticle(docSnap) {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
  };
}

/* ────────────────────────────────────────────────────────────
   READ
   ──────────────────────────────────────────────────────────── */
export async function getSEOArticles({ status, type, relatedProductId } = {}) {
  const cacheKey = `articles:${status}:${type}:${relatedProductId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const ref = collection(db, COL);
    const constraints = [];
    if (status) constraints.push(where('status', '==', status));
    if (type) constraints.push(where('type', '==', type));
    if (relatedProductId) constraints.push(where('relatedProductId', '==', relatedProductId));
    constraints.push(orderBy('createdAt', 'desc'));

    const snap = await getDocs(query(ref, ...constraints));
    const articles = snap.docs.map(toArticle);
    cacheSet(cacheKey, articles);
    return articles;
  } catch (err) {
    console.warn('[seoService] getSEOArticles failed:', err.message);
    return [];
  }
}

export async function getSEOArticleBySlug(slug) {
  const cacheKey = `slug:${slug}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const ref = collection(db, COL);
    const snap = await getDocs(query(ref, where('slug', '==', slug)));
    if (snap.empty) return null;
    const article = toArticle(snap.docs[0]);
    cacheSet(cacheKey, article);
    return article;
  } catch (err) {
    console.warn('[seoService] getSEOArticleBySlug failed:', err.message);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────
   WRITE (Admin only — enforced at Firestore security rules level)
   ──────────────────────────────────────────────────────────── */
export async function syncSEOArticle(articleData) {
  try {
    const existing = await getSEOArticleBySlug(articleData.slug);
    if (existing) {
      const docRef = doc(db, COL, existing.id);
      await updateDoc(docRef, { ...articleData, updatedAt: serverTimestamp() });
      cacheInvalidate('articles:');
      cacheInvalidate('slug:');
      return existing.id;
    } else {
      const ref = collection(db, COL);
      const docRef = await addDoc(ref, {
        ...articleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      cacheInvalidate('articles:');
      cacheInvalidate('slug:');
      return docRef.id;
    }
  } catch (err) {
    console.error('[seoService] syncSEOArticle failed:', err);
    throw err;
  }
}

export async function updateArticle(id, updates) {
  try {
    const docRef = doc(db, COL, id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    cacheInvalidate('articles:');
    cacheInvalidate('slug:');
    return true;
  } catch (err) {
    console.error('[seoService] updateArticle failed:', err);
    throw err;
  }
}

export async function publishArticle(id) {
  return updateArticle(id, { status: 'published' });
}

export async function unpublishArticle(id) {
  return updateArticle(id, { status: 'draft' });
}

export async function deleteArticle(id) {
  try {
    await deleteDoc(doc(db, COL, id));
    cacheInvalidate('articles:');
    cacheInvalidate('slug:');
    return true;
  } catch (err) {
    console.error('[seoService] deleteArticle failed:', err);
    throw err;
  }
}
