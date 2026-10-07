import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const projectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID || "kuda-prima-attandance-dev";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp, "asia-southeast2");
export const storage = getStorage(firebaseApp);

export const useFirebaseEmulators =
  import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

if (useFirebaseEmulators) {
  try {
    // Keep hot reload from registering the same emulator twice.
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch {
    // Already connected or in isolated test environment
  }
  try {
    // Only connect if not already connected
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch {
    // Already connected or in isolated test environment
  }
}

if (!useFirebaseEmulators && import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
}
