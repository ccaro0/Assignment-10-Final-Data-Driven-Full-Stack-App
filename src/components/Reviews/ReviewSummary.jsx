// Load the Vertex AI plugin. It bills the Firebase project's Cloud account.
import { vertexAI } from "@genkit-ai/google-genai";
// Load the function that creates a Genkit AI instance
import { genkit } from "genkit";
// Load the helper that reads every review for one shoe
import { getReviewsByShoeId } from "@/src/lib/firebase/firestore.js";
// Load the helper that builds a Firebase app from the signed-in user's session
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// Load the function that creates a Firestore handle from a Firebase app
import { getFirestore } from "firebase/firestore";

// GeminiSummary asks Vertex AI for a one-sentence summary of this shoe's reviews
export async function GeminiSummary({ shoeId }) {
  // Build a server Firebase app authenticated with the session cookie
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  // Read this shoe's reviews from the ratings subcollection
  const reviews = await getReviewsByShoeId(
    getFirestore(firebaseServerApp), // Firestore bound to the authenticated server app
    shoeId // id of the shoe whose reviews should be summarized
  );

  // Character placed between reviews so the model can tell them apart
  const reviewSeparator = "@";
  // Instructions plus the joined review text sent to the model
  const prompt = `
    Based on the following running shoe reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the shoe. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `;

  // Catch a missing key or a failed model call and show a short message instead
  try {
    // Vertex bills week9-10-assignment. App Hosting uses that project's
    // service account, so this call does not use the Gemini Developer API.
    const ai = genkit({
      plugins: [
        vertexAI({
          projectId: "week9-10-assignment",
          location: "global",
        }),
      ],
      // Current Flash model. Gemini 3.8 Flash is served from the global endpoint.
      model: vertexAI.model("gemini-3.8-flash"),
    });
    // Send the prompt and keep the text the model returns
    const { text } = await ai.generate(prompt);

    // Render the summary under the shoe details
    return (
      <div className="shoe__review_summary">
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
    <div className="shoe__review_summary">
      {/* Message shown until the model responds */}
      <p>✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}
