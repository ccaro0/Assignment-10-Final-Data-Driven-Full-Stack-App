// Load the generator that builds fake shoes and their reviews
import { generateFakeShoesAndReviews } from "@/src/lib/fakeShoes.js";

// Load the Firestore helpers used to read, filter, listen, and write documents
import {
  collection, // reference a collection or subcollection
  onSnapshot, // listen for live document or query updates
  query, // attach filters and sort order to a collection
  getDocs, // run a query once and return the documents
  doc, // reference a single document
  getDoc, // read a single document once
  updateDoc, // change fields on an existing document
  orderBy, // sort query results by a field
  Timestamp, // Firestore date type, available for review writes
  runTransaction, // run reads and writes atomically, available for ratings
  where, // keep only documents that match a condition
  addDoc, // create a document with an auto-generated id
  getFirestore, // build a Firestore instance from a Firebase app
} from "firebase/firestore"; // Cloud Firestore SDK

// Load the client-side Firestore instance used by browser-only writes and listeners
import { db } from "@/src/lib/firebase/clientApp";

// Save a new photo URL onto one shoe document
export async function updateShoeImageReference(shoeId, publicImageUrl) {
  // Point at the shoe document inside the shoes collection
  const shoeRef = doc(collection(db, "shoes"), shoeId);
  // Only write when a document reference was created
  if (shoeRef) {
    // Replace the photo field with the public URL of the uploaded image
    await updateDoc(shoeRef, { photo: publicImageUrl });
  }
}

// Update the shoe totals and write the new review in one transaction
const updateWithRating = async (
  transaction, // Firestore transaction that can read and write atomically
  docRef, // reference to the shoe document being reviewed
  newRatingDocument, // reference for the new document in the ratings subcollection
  review // rating, text, and user id submitted from the form
) => {
  // Read the current shoe inside the transaction
  const shoe = await transaction.get(docRef);
  // Fields already stored on that shoe
  const data = shoe.data();
  // Add one to the existing count, or start at 1 when this is the first review
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;
  // Add this review's numeric rating to the running sum
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);
  // Average is the new sum divided by the new count
  const newAverage = newSumRating / newNumRatings;

  // Write the updated count, sum, and average back onto the shoe
  transaction.update(docRef, {
    numRatings: newNumRatings, // how many reviews the shoe now has
    sumRating: newSumRating, // total of every star rating
    avgRating: newAverage, // mean star rating shown on the card
  });

  // Create the review document with the form fields and the current time
  transaction.set(newRatingDocument, {
    ...review, // copy text, rating, and userId from the form
    timestamp: Timestamp.fromDate(new Date()), // store when the review was submitted
  });
};

// Save one review and update that shoe's rating totals together
export async function addReviewToShoe(db, shoeId, review) {
  // Refuse to write when the caller did not name a shoe
  if (!shoeId) {
    throw new Error("No shoe ID has been provided.");
  }

  // Refuse to write when the caller did not pass a review
  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  // Roll back both writes if either the shoe update or the review insert fails
  try {
    // Point at the shoe document that will receive the new totals
    const docRef = doc(collection(db, "shoes"), shoeId);
    // Reserve a new auto-id document in that shoe's ratings subcollection
    const newRatingDocument = doc(collection(db, `shoes/${shoeId}/ratings`));

    // Run the read and both writes as one atomic transaction
    await runTransaction(db, (transaction) =>
      updateWithRating(transaction, docRef, newRatingDocument, review),
    );
  } catch (error) {
    // Print the failure before rethrowing it to the Server Action
    console.error("There was an error adding the rating to the shoe", error);
    // Let the caller see that the review was not saved
    throw error;
  }
}

// Add category, brand, price, and sort constraints to a shoes query
function applyQueryFilters(q, { category, brand, price, sort }) {
  // Narrow the query to one category when the filter is present
  if (category) {
    // Keep documents whose category field equals the selected category
    q = query(q, where("category", "==", category));
  }
  // Narrow the query to one brand when the filter is present
  if (brand) {
    // Keep documents whose brand field equals the selected brand
    q = query(q, where("brand", "==", brand));
  }
  // Narrow the query to one price level when the filter is present
  if (price) {
    // Price is stored as a number; the filter string's length is that number
    q = query(q, where("price", "==", price.length));
  }
  // Default to highest average rating, and also use it when sort is "Rating"
  if (sort === "Rating" || !sort) {
    // Highest avgRating first
    q = query(q, orderBy("avgRating", "desc"));
  } else if (sort === "Review") {
    // Most-reviewed shoes first when the user sorts by review count
    q = query(q, orderBy("numRatings", "desc"));
  }
  // Hand the filtered, ordered query back to the caller
  return q;
}

// Read shoes once; db defaults to the client instance and filters default to none
export async function getShoes(db = db, filters = {}) {
  // Start with every document in the shoes collection
  let q = query(collection(db, "shoes"));

  // Apply the category, brand, price, and sort filters from the caller
  q = applyQueryFilters(q, filters);
  // Run the query and wait for the matching documents
  const results = await getDocs(q);
  // Turn each Firestore document into a plain object the UI can render
  return results.docs.map((doc) => {
    // Build one shoe object for this document
    return {
      // Keep the document id, which is not included in doc.data()
      id: doc.id,
      // Copy every field stored on the document
      ...doc.data(),
      // Only plain objects can be passed to Client Components from Server Components
      // Convert the Firestore Timestamp into a JavaScript Date
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Listen for shoe changes and pass each new list to cb
export function getShoesSnapshot(cb, filters = {}) {
  // Refuse to subscribe when the caller did not pass a function
  if (typeof cb !== "function") {
    // Report the bad argument in the console
    console.log("Error: The callback parameter is not a function");
    // Stop before calling onSnapshot
    return;
  }

  // Start with every document in the shoes collection
  let q = query(collection(db, "shoes"));
  // Apply the same filters used by the one-time query
  q = applyQueryFilters(q, filters);

  // Re-run the mapper whenever the query results change, and return the unsubscribe function
  return onSnapshot(q, (querySnapshot) => {
    // Turn the latest documents into plain shoe objects
    const results = querySnapshot.docs.map((doc) => {
      // Build one shoe object for this document
      return {
        // Keep the document id
        id: doc.id,
        // Copy every stored field
        ...doc.data(),
        // Only plain objects can be passed to Client Components from Server Components
        // Convert the Firestore Timestamp into a JavaScript Date
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    // Deliver the fresh list to the caller
    cb(results);
  });
}

// Read one shoe document by its id
export async function getShoeById(db, shoeId) {
  // Refuse to query when the id is missing
  if (!shoeId) {
    // Report the bad id in the console
    console.log("Error: Invalid ID received: ", shoeId);
    // Stop before calling Firestore
    return;
  }
  // Point at shoes/{shoeId}
  const docRef = doc(db, "shoes", shoeId);
  // Fetch that document and wait for the snapshot
  const docSnap = await getDoc(docRef);
  // Return the stored fields as a plain object
  return {
    // Copy every field on the document
    ...docSnap.data(),
    // Convert the Firestore Timestamp into a JavaScript Date
    timestamp: docSnap.data().timestamp.toDate(),
  };
}

// Listen to one shoe document and pass each update to cb
export function getShoeSnapshotById(shoeId, cb) {
  // Refuse to subscribe when the id is missing
  if (!shoeId) {
    // Report the bad id in the console
    console.log("Error: Invalid ID received: ", shoeId);
    // Stop before calling onSnapshot
    return;
  }

  // Refuse to subscribe when the caller did not pass a function
  if (typeof cb !== "function") {
    // Report the bad argument in the console
    console.log("Error: The callback parameter is not a function");
    // Stop before calling onSnapshot
    return;
  }

  // Point at shoes/{shoeId} on the client database
  const docRef = doc(db, "shoes", shoeId);
  // Re-run the callback whenever that document changes, and return the unsubscribe function
  return onSnapshot(docRef, (docSnap) => {
    // Deliver the latest fields as a plain object
    cb({
      // Copy every stored field
      ...docSnap.data(),
      // Convert the Firestore Timestamp into a JavaScript Date
      timestamp: docSnap.data().timestamp.toDate(),
    });
  });
}

// Read every review stored under one shoe, newest first
export async function getReviewsByShoeId(db, shoeId) {
  // Refuse to query when the shoe id is missing
  if (!shoeId) {
    // Report the bad id in the console
    console.log("Error: Invalid shoeId received: ", shoeId);
    // Stop before calling Firestore
    return;
  }

  // Build a query against the ratings subcollection, sorted by newest timestamp
  const q = query(
    // ratings lives under shoes/{shoeId}
    collection(db, "shoes", shoeId, "ratings"),
    // Newest reviews first
    orderBy("timestamp", "desc")
  );

  // Run the query and wait for the matching review documents
  const results = await getDocs(q);
  // Turn each review document into a plain object
  return results.docs.map((doc) => {
    // Build one review object for this document
    return {
      // Keep the document id
      id: doc.id,
      // Copy every stored field
      ...doc.data(),
      // Only plain objects can be passed to Client Components from Server Components
      // Convert the Firestore Timestamp into a JavaScript Date
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Listen to one shoe's reviews and pass each new list to cb
export function getReviewsSnapshotByShoeId(shoeId, cb) {
  // Refuse to subscribe when the shoe id is missing
  if (!shoeId) {
    // Report the bad id in the console
    console.log("Error: Invalid shoeId received: ", shoeId);
    // Stop before calling onSnapshot
    return;
  }

  // Build the same newest-first query used by the one-time read
  const q = query(
    // ratings lives under shoes/{shoeId} on the client database
    collection(db, "shoes", shoeId, "ratings"),
    // Newest reviews first
    orderBy("timestamp", "desc")
  );
  // Re-run the mapper whenever a review changes, and return the unsubscribe function
  return onSnapshot(q, (querySnapshot) => {
    // Turn the latest review documents into plain objects
    const results = querySnapshot.docs.map((doc) => {
      // Build one review object for this document
      return {
        // Keep the document id
        id: doc.id,
        // Copy every stored field
        ...doc.data(),
        // Only plain objects can be passed to Client Components from Server Components
        // Convert the Firestore Timestamp into a JavaScript Date
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    // Deliver the fresh review list to the caller
    cb(results);
  });
}

// Write a batch of generated shoes, each with its own reviews
export async function addFakeShoesAndReviews() {
  // Generate the sample shoes and the reviews that belong to each one
  const data = await generateFakeShoesAndReviews();
  // Handle one shoe and its reviews at a time
  for (const { shoeData, ratingsData } of data) {
    // Keep going with the next shoe if this write fails
    try {
      // Add the shoe document and keep the reference Firestore returns
      const docRef = await addDoc(
        // Write into the top-level shoes collection
        collection(db, "shoes"),
        // Fields for this generated shoe
        shoeData
      );

      // Write each review into that shoe's ratings subcollection
      for (const ratingData of ratingsData) {
        // Wait for this review document to be created before the next one
        await addDoc(
          // Subcollection path uses the id of the shoe just created
          collection(db, "shoes", docRef.id, "ratings"),
          // Fields for this generated review
          ratingData
        );
      }
    } catch (e) {
      // Short message for the console when a write fails
      console.log("There was an error adding the document");
      // Full error object so the cause is visible while debugging
      console.error("Error adding document: ", e);
    }
  }
}
