// Firebase web app config for project: prithviscan
// Fill apiKey + appId from Firebase Console → Project settings → Your apps → Web app
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_WEB_API_KEY",
  authDomain: "prithviscan.firebaseapp.com",
  projectId: "prithviscan",
  storageBucket: "prithviscan.firebasestorage.app",
  messagingSenderId: "767784367361",
  appId: "REPLACE_WITH_WEB_APP_ID",
};

export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.startsWith("REPLACE_") &&
    Boolean(firebaseConfig.appId) &&
    !firebaseConfig.appId.startsWith("REPLACE_")
  );
}
