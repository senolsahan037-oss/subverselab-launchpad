import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Google Analytics is NOT started here. It is opt-in: src/consent.js loads
// firebase/analytics and calls getAnalytics(app) only after the visitor accepts
// in the cookie banner, so nothing from Google Analytics runs or is stored
// before that choice.
export const app = initializeApp(firebaseConfig);
export const MEASUREMENT_ID = firebaseConfig.measurementId;
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const storage = getStorage(app);
export const db = getFirestore(app);
