import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let app;
let auth;
let googleProvider;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase web config is incomplete. Add apiKey and appId in js/firebase-config.js");
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    isAnalyticsSupported()
      .then((ok) => {
        if (ok) getAnalytics(app);
      })
      .catch(() => {});
  }
  return app;
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return auth;
}

export { isFirebaseConfigured };

export function watchAuth(callback) {
  try {
    const a = getFirebaseAuth();
    return onAuthStateChanged(a, callback);
  } catch (err) {
    callback(null);
    return () => {};
  }
}

export async function signUpEmail(name, email, password) {
  const a = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(a, email, password);
  if (name?.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function signInEmail(email, password) {
  const a = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(a, email, password);
  return cred.user;
}

export async function signInGoogle() {
  const a = getFirebaseAuth();
  try {
    const cred = await signInWithPopup(a, googleProvider);
    return cred.user;
  } catch (err) {
    if (err?.code === "auth/popup-blocked") {
      await signInWithRedirect(a, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function completeGoogleRedirect() {
  try {
    const a = getFirebaseAuth();
    return await getRedirectResult(a);
  } catch {
    return null;
  }
}

export async function logOut() {
  const a = getFirebaseAuth();
  await signOut(a);
}

let recaptchaVerifier = null;
let phoneConfirmation = null;

/** Prepare invisible reCAPTCHA for phone OTP (container id in auth.html). */
export function setupPhoneRecaptcha(containerId = "phoneRecaptcha") {
  const a = getFirebaseAuth();
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(a, containerId, { size: "invisible" });
  return recaptchaVerifier;
}

/** Send OTP to E.164 phone, e.g. +9198XXXXXXXX */
export async function sendPhoneOtp(phoneE164) {
  const a = getFirebaseAuth();
  if (!recaptchaVerifier) setupPhoneRecaptcha();
  phoneConfirmation = await signInWithPhoneNumber(a, phoneE164, recaptchaVerifier);
  return true;
}

export async function confirmPhoneOtp(code) {
  if (!phoneConfirmation) throw new Error("Request an OTP first.");
  const cred = await phoneConfirmation.confirm(String(code || "").trim());
  phoneConfirmation = null;
  return cred.user;
}

export function authErrorMessage(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "That email already has an account. Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase yet.",
    "auth/unauthorized-domain": "Add this domain under Firebase Auth → Settings → Authorized domains.",
    "auth/invalid-phone-number": "Enter a valid phone with country code (e.g. +91…).",
    "auth/invalid-verification-code": "That OTP is incorrect. Try again.",
    "auth/code-expired": "OTP expired. Request a new code.",
    "auth/missing-phone-number": "Enter your phone number.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  };
  return map[code] || err?.message || "Something went wrong. Please try again.";
}
