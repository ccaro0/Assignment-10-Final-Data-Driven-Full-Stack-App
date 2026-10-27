import Shoe from "@/src/components/Shoe.jsx";
import { Suspense } from "react";
import { getShoeById } from "@/src/lib/firebase/firestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser,
} from "@/src/lib/firebase/serverApp.js";
import ReviewsList, {
  ReviewsListSkeleton,
} from "@/src/components/Reviews/ReviewsList";
import {
  GeminiSummary,
  GeminiSummarySkeleton,
} from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

export default async function Home(props) {
  // This is a server component, we can access URL
  // parameters via Next.js and download the data
  // we need for this page
  const params = await props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const shoe = await getShoeById(getFirestore(firebaseServerApp), params.id);

  return (
    <main className="main__shoe">
      <Shoe
        id={params.id}
        initialShoe={shoe}
        initialUserId={currentUser?.uid || ""}
      >
        <Suspense fallback={<GeminiSummarySkeleton />}>
          <GeminiSummary shoeId={params.id} />
        </Suspense>
      </Shoe>
      <Suspense
        fallback={<ReviewsListSkeleton numReviews={shoe.numRatings} />}
      >
        <ReviewsList shoeId={params.id} userId={currentUser?.uid || ""} />
      </Suspense>
    </main>
  );
}
