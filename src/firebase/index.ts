'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export function initializeFirebase() {
  try {
    // Check if the config has been replaced with actual values
    const isConfigValid = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REPLACE_');
    
    if (!isConfigValid) {
      console.warn("DeepScan AI: Firebase configuration is missing or invalid. Operating in 'Offline Forensic Mode'.");
      return { app: null, db: null, auth: null };
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    return { app, db, auth };
  } catch (error) {
    console.error("DeepScan AI: Failed to initialize Firebase connection.", error);
    return { app: null, db: null, auth: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
export * from './errors';
export * from './error-emitter';
