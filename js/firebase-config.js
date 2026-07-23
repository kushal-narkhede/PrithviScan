// Firebase web app config for project: prithviscan
export const firebaseConfig = {
  apiKey: "AIzaSyDKQQssXTzKeLCD4TYxlREOzKOBbwY24BQ",
  authDomain: "prithviscan.firebaseapp.com",
  projectId: "prithviscan",
  storageBucket: "prithviscan.firebasestorage.app",
  messagingSenderId: "767784367361",
  appId: "1:767784367361:web:8eb2fba17b07441d771700",
  measurementId: "G-QYZG1R7D3H",
};

export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.startsWith("REPLACE_") &&
    Boolean(firebaseConfig.appId) &&
    !firebaseConfig.appId.startsWith("REPLACE_")
  );
}
