// Pull in the Google provider, popup sign-in, and the two auth listeners
import {
  GoogleAuthProvider, // builds the provider used for Google sign-in
  signInWithPopup, // opens a popup and signs in with a provider
  // Rename so this file can export its own onAuthStateChanged wrapper
  onAuthStateChanged as _onAuthStateChanged, // fires on sign-in and sign-out
  // Rename so this file can export its own onIdTokenChanged wrapper
  onIdTokenChanged as _onIdTokenChanged, // fires when the ID token is issued or refreshed
} from "firebase/auth"; // Firebase Authentication SDK

// Pull in the client-side Auth instance created in clientApp
import { auth } from "@/src/lib/firebase/clientApp";

// Subscribe a callback to sign-in and sign-out changes
export function onAuthStateChanged(cb) {
  // Attach the callback to this app's Auth instance and return the unsubscribe function
  return _onAuthStateChanged(auth, cb);
}

// Subscribe a callback to ID token changes, including refreshes
export function onIdTokenChanged(cb) {
  // Attach the callback to this app's Auth instance and return the unsubscribe function
  return _onIdTokenChanged(auth, cb);
}

// Start a Google sign-in popup and wait for it to finish
export async function signInWithGoogle() {
  // Create a provider that tells Firebase to use Google accounts
  const provider = new GoogleAuthProvider();

  // Attempt the popup; Firebase rejects the promise if the user cancels or it fails
  try {
    // Open the popup and sign the client Auth instance in with the result
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Log the failure without throwing, so the UI does not crash
    console.error("Error signing in with Google", error);
  }
}

// Sign the current user out of the client Auth instance
export async function signOut() {
  // Attempt the sign-out; Firebase rejects the promise if it fails
  try {
    // Clear the current user and return the promise so callers can await it
    return auth.signOut();
  } catch (error) {
    // Log the failure without throwing, so the UI does not crash
    console.error("Error signing out with Google", error);
  }
}
