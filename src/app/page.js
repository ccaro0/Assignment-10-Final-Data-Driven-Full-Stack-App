// Load the component that renders the shoe cards on the home page
import ShoeListings from "@/src/components/ShoeListings.jsx";
// Load the helper that queries the shoes collection in Firestore
import { getShoes } from "@/src/lib/firebase/firestore.js";
// Load the helper that builds a Firebase app from the signed-in user's session
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp.js";
// Load the function that creates a Firestore handle from a Firebase app
import { getFirestore } from "firebase/firestore";

// Force next.js to treat this route as server-side rendered
// Without this line, during the build process, next.js will treat this route as static and build a static HTML file for it

// Render this route on every request so auth and query filters stay fresh
export const dynamic = "force-dynamic";

// This line also forces this route to be server-side rendered
// export const revalidate = 0;

// Home is the async Server Component for "/"; props carries the request data
export default async function Home(props) {
  // Next.js provides searchParams as a promise, so wait for the query string
  const searchParams = await props.searchParams;
  // Using seachParams which Next.js provides, allows the filtering to happen on the server-side, for example:
  // ?brand=Nike&category=Road&sort=Review
  // Build a server Firebase app authenticated with the "__session" cookie
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  // Fetch shoes that match the filters in the URL
  const shoes = await getShoes(
    // Point Firestore at the authenticated server app
    getFirestore(firebaseServerApp),
    // Pass brand, category, price, and sort from the query string
    searchParams
  );
  // Send the home page markup back to the browser
  return (
    // Wrapper element; the main__home class applies the home-page layout
    <main className="main__home">
      {/* Listings component receives the server-fetched shoes */}
      <ShoeListings
        // First render uses this array before the client listener updates it
        initialShoes={shoes}
        // Same filters the server used, so the client query stays in sync
        searchParams={searchParams}
      />
    </main>
  );
}
