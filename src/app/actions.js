"use server";

import { addReviewToShoe } from "@/src/lib/firebase/firestore.js";
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp.js";
import { getFirestore } from "firebase/firestore";

// This is a Server Action
// https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
export async function handleReviewFormSubmission(data) {
    const { firebaseServerApp } = await getAuthenticatedAppForUser();
    const db = getFirestore(firebaseServerApp);
  
    await addReviewToShoe(db, data.get("shoeId"), {
      text: data.get("text"),
      rating: data.get("rating"),
  
      // This came from a hidden form field.
      userId: data.get("userId"),
    });
  }