// enforces that this code can only be called on the server
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

// Load Next.js cookies so this function can read the session cookie
import { cookies } from "next/headers";
// Load both app initializers: one for the base app, one for the server app
import { initializeServerApp, initializeApp } from "firebase/app";

// Load the Auth factory used to read the user attached to the server app
import { getAuth } from "firebase/auth";

// Returns an authenticated client SDK instance for use in Server Side Rendering
// and Static Site Generation
export async function getAuthenticatedAppForUser() {
  // Read the ID token the client stored in the "__session" cookie, if any
  const authIdToken = (await cookies()).get("__session")?.value;

  // Firebase Server App is a new feature in the JS SDK that allows you to
  // instantiate the SDK with credentials retrieved from the client & has
  // other affordances for use in server environments.
  const firebaseServerApp = initializeServerApp(
    // https://github.com/firebase/firebase-js-sdk/issues/8863#issuecomment-2751401913
    // Create a base Firebase app; the server app is layered on top of it
    initializeApp(),
    {
      // Pass the cookie token so server reads run as that signed-in user
      authIdToken,
    }
  );

  // Get the Auth instance bound to this server app
  const auth = getAuth(firebaseServerApp);
  // Wait until Firebase has applied the token and currentUser is settled
  await auth.authStateReady();

  // Return the app for Firestore and the user it authenticated, which may be null
  return { firebaseServerApp, currentUser: auth.currentUser };
}
