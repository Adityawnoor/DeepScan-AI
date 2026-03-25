'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'

export interface FirebaseSdks {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

// Resilient initialization that doesn't crash if config is missing or invalid
export function initializeFirebase(): FirebaseSdks {
  const isConfigValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

  try {
    if (!getApps().length) {
      if (!isConfigValid) {
        console.warn('Firebase configuration is missing or placeholder. Switching to Offline Forensic Mode.');
        return { firebaseApp: null, auth: null, firestore: null };
      }

      let firebaseApp;
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        firebaseApp = initializeApp(firebaseConfig);
      }
      return getSdks(firebaseApp);
    }
    return getSdks(getApp());
  } catch (error) {
    console.error('Firebase failed to initialize:', error);
    return { firebaseApp: null, auth: null, firestore: null };
  }
}

export function getSdks(firebaseApp: FirebaseApp): FirebaseSdks {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
