// Load the Vertex AI plugin that bills the Firebase project's Cloud account
import { vertexAI } from "@genkit-ai/google-genai";
// Load the function that creates a Genkit AI instance
import { genkit } from "genkit";
// Load the helper that reads every review for one restaurant
import { getReviewsByRestaurantId } from "@/src/lib/firebase/firestore.js";
// Load the helper that builds a Firebase app from the signed-in user's session
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// Load the function that creates a Firestore handle from a Firebase app
import { getFirestore } from "firebase/firestore";

// GeminiSummary asks Vertex AI for a one-sentence summary of this restaurant's reviews
export async function GeminiSummary({ restaurantId }) {
  // Build a server Firebase app authenticated with the session cookie
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  // Read this restaurant's reviews from the ratings subcollection
  const reviews = await getReviewsByRestaurantId(
    getFirestore(firebaseServerApp), // Firestore bound to the authenticated server app
    restaurantId // id of the restaurant whose reviews should be summarized
  );

  // Character placed between reviews so the model can tell them apart
  const reviewSeparator = "@";
  // Instructions plus the joined review text sent to the model
  const prompt = `
    Based on the following restaurant reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the restaurant. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `;

  // Catch a missing key or a failed model call and show a short message instead
  try {
    // Stop before calling the model when the Gemini key was never configured
    if (!process.env.GEMINI_API_KEY) {
      // Make sure GEMINI_API_KEY environment variable is set:
      // https://genkit.dev/docs/get-started/
      throw new Error(
        'GEMINI_API_KEY not set. Set it with "firebase apphosting:secrets:set GEMINI_API_KEY"'
      );
    }

    // Vertex AI uses the Firebase project's Cloud Billing account.
    // On App Hosting the runtime service account is the credential.
    const ai = genkit({
      plugins: [
        // Point Vertex at this Firebase project and the global Gemini endpoint
        vertexAI({
          projectId: "week-07-friendlyeats-codelab", // Cloud project that owns the billing account
          location: "global", // region required by the Gemini 3.5 model
        }),
      ],
      // Model that writes the one-sentence summary
      model: vertexAI.model("gemini-3.5-flash-lite"),
    });
    // Send the prompt and keep the text the model returns
    const { text } = await ai.generate(prompt);

    // Render the summary under the restaurant details
    return (
      <div className="restaurant__review_summary">
        {/* The one-sentence summary */}
        <p>{text}</p>
        {/* Label that tells the reader the sentence came from Gemini */}
        <p>✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    // Print the real error in the server log
    console.error(e);
    // Show a plain message on the page when the summary cannot be created
    return <p>Error summarizing reviews.</p>;
  }
}

// Placeholder shown while the summary Server Component is still loading
export function GeminiSummarySkeleton() {
  // Same wrapper class as the finished summary so the layout does not jump
  return (
    <div className="restaurant__review_summary">
      {/* Message shown until the model responds */}
      <p>✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}
