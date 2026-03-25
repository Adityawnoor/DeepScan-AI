
/**
 * Firebase configuration object.
 * 
 * CRITICAL FOR LOCALHOST:
 * To ensure your "Neural Knowledge Base" and "Identity Vault" persist when running 
 * on Localhost (npm run dev), follow these steps:
 * 
 * 1. Go to the Firebase Console (https://console.firebase.google.com).
 * 2. Select your DeepScan AI project.
 * 3. Click the Gear Icon (Project Settings) > General.
 * 4. Scroll down to "Your apps" and select the Web App (</> icon).
 * 5. Copy the 'firebaseConfig' object and replace the values below.
 * 
 * Once replaced, your Localhost environment will sync with the production 
 * Neural Ledger and Sentinel Monitoring bot.
 */
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_ACTUAL_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_ACTUAL_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_ACTUAL_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_YOUR_ACTUAL_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_ACTUAL_APP_ID"
};
