// Mark this file as a Client Component so it can use hooks and browser APIs
"use client";
// Pull in React and the effect hook that runs after the component mounts
import React, { useEffect } from "react";
// Pull in Next.js Link for client-side navigation without a full page load
import Link from "next/link";
// Pull in the auth helpers used by the sign-in button and the session listener
import {
  signInWithGoogle, // opens the Google sign-in popup
  signOut, // signs the current Firebase user out
  onIdTokenChanged, // runs when the user's ID token changes
} from "@/src/lib/firebase/auth.js"; // client auth helpers live in this module
// Pull in the helper that writes sample restaurants and reviews to Firestore
import { addFakeRestaurantsAndReviews } from "@/src/lib/firebase/firestore.js";
// Pull in cookie helpers so the ID token can be stored for the server
import { setCookie, deleteCookie } from "cookies-next";

// Keep the header in sync when the Firebase user or ID token changes
function useUserSession(initialUser) {
  // Subscribe once, and again if the server-provided user changes
  useEffect(() => {
    // Listen for sign-in, sign-out, and token refresh events
    return onIdTokenChanged(async (user) => {
      // A user object means someone is signed in
      if (user) {
        // Ask Firebase for a fresh ID token for that user
        const idToken = await user.getIdToken();
        // Store the token in the cookie the server reads on later requests
        await setCookie("__session", idToken);
      } else {
        // Nobody is signed in, so remove the session cookie
        await deleteCookie("__session");
      }
      // Skip the reload when the server already rendered this same user
      if (initialUser?.uid === user?.uid) {
        // Leave the page as it is
        return;
      }
      // Reload so Server Components re-render with the new session
      window.location.reload();
    });
  }, [initialUser]);

  // Hand the server-provided user back to the component that called this hook
  return initialUser;
}

// Header shows the logo and either the profile menu or the sign-in link
export default function Header({ initialUser }) {
  // Track the signed-in user, starting from the value rendered on the server
  const user = useUserSession(initialUser);

  // Run when the user chooses Sign Out from the menu
  const handleSignOut = (event) => {
    // Stop the anchor from jumping to "#"
    event.preventDefault();
    // Tell Firebase to clear the current user
    signOut();
  };

  // Run when the user chooses Sign In with Google
  const handleSignIn = (event) => {
    // Stop the anchor from jumping to "#"
    event.preventDefault();
    // Open the Google sign-in popup
    signInWithGoogle();
  };

  // Render the top bar
  return (
    // Site header that holds the logo and the account controls
    <header>
      {/* Logo link sends the user back to the home page */}
      <Link href="/" className="logo">
        {/* Friendly Eats wordmark */}
        <img src="/friendly-eats.svg" alt="FriendlyEats" />
        Friendly Eats {/* visible site name next to the logo */}
      </Link>
      {/* Show the profile menu when a user is signed in */}
      {user ? (
        // Group the profile image and the dropdown without an extra DOM node
        <>
          {/* Container for the avatar and the hover menu */}
          <div className="profile">
            {/* Visible name and photo in the header */}
            <p>
              {/* Photo from the Google account, or a placeholder if none exists */}
              <img
                className="profileImage"
                // Use the account photo URL, falling back to the local placeholder
                src={user.photoURL || "/profile.svg"}
                // Use the email as the image description
                alt={user.email}
              />
              {/* Display name shown next to the photo */}
              {user.displayName}
            </p>

            {/* Dropdown that appears from the profile area */}
            <div className="menu">
              ... {/* placeholder shown in the menu trigger */}
              {/* List of account actions */}
              <ul>
                {/* Repeat the display name at the top of the menu */}
                <li>{user.displayName}</li>

                {/* Menu item that seeds Firestore with sample data */}
                <li>
                  {/* Click runs the sample-data writer; "#" is cancelled by the handler */}
                  <a href="#" onClick={addFakeRestaurantsAndReviews}>
                    Add sample restaurants
                  </a>
                </li>

                {/* Menu item that signs the current user out */}
                <li>
                  {/* Click calls handleSignOut instead of following the link */}
                  <a href="#" onClick={handleSignOut}>
                    Sign Out {/* label for the sign-out action */}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        // Signed-out state: a single link that starts Google sign-in
        <div className="profile">
          {/* Click calls handleSignIn instead of following the link */}
          <a href="#" onClick={handleSignIn}>
            {/* Placeholder avatar shown before anyone signs in */}
            <img src="/profile.svg" alt="A placeholder user image" />
            Sign In with Google {/* label for the signed-out action */}
          </a>
        </div>
      )}
    </header>
  );
}
