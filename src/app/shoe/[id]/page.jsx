import Shoe from "@/src/components/Shoe.jsx";
import { getShoeById } from "@/src/lib/firebase/firestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser,
} from "@/src/lib/firebase/serverApp.js";
import ReviewsList from "@/src/components/Reviews/ReviewsList";
import { GeminiSummary } from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

export default async function Home(props) {
  // This is a server component, we can access URL
  // parameters via Next.js and download the data
  // we need for this page
  const params = await props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const shoe = await getShoeById(getFirestore(firebaseServerApp), params.id);
  const userId = currentUser?.uid || "";
  // Finish the summary and the review list before sending HTML, so the
  // browser does not stay on the loading placeholders.
  const [summary, reviews] = await Promise.all([
    GeminiSummary({ shoeId: params.id }),
    ReviewsList({ shoeId: params.id, userId }),
  ]);

  return (
    <main className="main__shoe">
      <Shoe id={params.id} initialShoe={shoe} initialUserId={userId}>
        {summary}
      </Shoe>
      {reviews}
    </main>
  );
}
