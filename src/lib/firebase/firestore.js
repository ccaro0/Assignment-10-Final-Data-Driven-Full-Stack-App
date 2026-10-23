// Load the generator that builds fake restaurants and their reviews
import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js";

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

// Save a new photo URL onto one restaurant document
export async function updateRestaurantImageReference(
  restaurantId,
  publicImageUrl
) {
  // Point at the restaurant document inside the restaurants collection
  const restaurantRef = doc(collection(db, "restaurants"), restaurantId);
  // Only write when a document reference was created
  if (restaurantRef) {
    // Replace the photo field with the public URL of the uploaded image
    await updateDoc(restaurantRef, { photo: publicImageUrl });
  }
}

// Update the restaurant totals and write the new review in one transaction
const updateWithRating = async (
  transaction, // Firestore transaction that can read and write atomically
  docRef, // reference to the restaurant document being reviewed
  newRatingDocument, // reference for the new document in the ratings subcollection
  review // rating, text, and user id submitted from the form
) => {
  // Read the current restaurant inside the transaction
  const restaurant = await transaction.get(docRef);
  // Fields already stored on that restaurant
  const data = restaurant.data();
  // Add one to the existing count, or start at 1 when this is the first review
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;
  // Add this review's numeric rating to the running sum
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);
  // Average is the new sum divided by the new count
  const newAverage = newSumRating / newNumRatings;

  // Write the updated count, sum, and average back onto the restaurant
  transaction.update(docRef, {
    numRatings: newNumRatings, // how many reviews the restaurant now has
    sumRating: newSumRating, // total of every star rating
    avgRating: newAverage, // mean star rating shown on the card
  });

  // Create the review document with the form fields and the current time
  transaction.set(newRatingDocument, {
    ...review, // copy text, rating, and userId from the form
    timestamp: Timestamp.fromDate(new Date()), // store when the review was submitted
  });
};

// Save one review and update that restaurant's rating totals together
export async function addReviewToRestaurant(db, restaurantId, review) {
  // Refuse to write when the caller did not name a restaurant
  if (!restaurantId) {
    throw new Error("No restaurant ID has been provided.");
  }

  // Refuse to write when the caller did not pass a review
  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  // Roll back both writes if either the restaurant update or the review insert fails
  try {
    // Point at the restaurant document that will receive the new totals
    const docRef = doc(collection(db, "restaurants"), restaurantId);
    // Reserve a new auto-id document in that restaurant's ratings subcollection
    const newRatingDocument = doc(
      collection(db, `restaurants/${restaurantId}/ratings`),
    );

    // Run the read and both writes as one atomic transaction
    await runTransaction(db, (transaction) =>
      updateWithRating(transaction, docRef, newRatingDocument, review),
    );
  } catch (error) {
    // Print the failure before rethrowing it to the Server Action
    console.error(
      "There was an error adding the rating to the restaurant",
      error,
    );
    // Let the caller see that the review was not saved
    throw error;
  }
}


// Add category, city, price, and sort constraints to a restaurants query
function applyQueryFilters(q, { category, city, price, sort }) {
  // Narrow the query to one category when the filter is present
  if (category) {
    // Keep documents whose category field equals the selected category
    q = query(q, where("category", "==", category));
  }
  // Narrow the query to one city when the filter is present
  if (city) {
    // Keep documents whose city field equals the selected city
    q = query(q, where("city", "==", city));
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
    // Most-reviewed restaurants first when the user sorts by review count
    q = query(q, orderBy("numRatings", "desc"));
  }
  // Hand the filtered, ordered query back to the caller
  return q;
}

// Read restaurants once; db defaults to the client instance and filters default to none
export async function getRestaurants(db = db, filters = {}) {
  // Start with every document in the restaurants collection
  let q = query(collection(db, "restaurants"));

  // Apply the category, city, price, and sort filters from the caller
  q = applyQueryFilters(q, filters);
  // Run the query and wait for the matching documents
  const results = await getDocs(q);
  // Turn each Firestore document into a plain object the UI can render
  return results.docs.map((doc) => {
    // Build one restaurant object for this document
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

// Listen for restaurant changes and pass each new list to cb
export function getRestaurantsSnapshot(cb, filters = {}) {
  // Refuse to subscribe when the caller did not pass a function
  if (typeof cb !== "function") {
    // Report the bad argument in the console
    console.log("Error: The callback parameter is not a function");
    // Stop before calling onSnapshot
    return;
  }

  // Start with every document in the restaurants collection
  let q = query(collection(db, "restaurants"));
  // Apply the same filters used by the one-time query
  q = applyQueryFilters(q, filters);

  // Re-run the mapper whenever the query results change, and return the unsubscribe function
  return onSnapshot(q, (querySnapshot) => {
    // Turn the latest documents into plain restaurant objects
    const results = querySnapshot.docs.map((doc) => {
      // Build one restaurant object for this document
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

// Read one restaurant document by its id
export async function getRestaurantById(db, restaurantId) {
  // Refuse to query when the id is missing
  if (!restaurantId) {
    // Report the bad id in the console
    console.log("Error: Invalid ID received: ", restaurantId);
    // Stop before calling Firestore
    return;
  }
  // Point at restaurants/{restaurantId}
  const docRef = doc(db, "restaurants", restaurantId);
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

// Listen to one restaurant document and pass each update to cb
export function getRestaurantSnapshotById(restaurantId, cb) {
  // Refuse to subscribe when the id is missing
  if (!restaurantId) {
    // Report the bad id in the console
    console.log("Error: Invalid ID received: ", restaurantId);
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

  // Point at restaurants/{restaurantId} on the client database
  const docRef = doc(db, "restaurants", restaurantId);
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

// Read every review stored under one restaurant, newest first
export async function getReviewsByRestaurantId(db, restaurantId) {
  // Refuse to query when the restaurant id is missing
  if (!restaurantId) {
    // Report the bad id in the console
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    // Stop before calling Firestore
    return;
  }

  // Build a query against the ratings subcollection, sorted by newest timestamp
  const q = query(
    // ratings lives under restaurants/{restaurantId}
    collection(db, "restaurants", restaurantId, "ratings"),
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

// Listen to one restaurant's reviews and pass each new list to cb
export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
  // Refuse to subscribe when the restaurant id is missing
  if (!restaurantId) {
    // Report the bad id in the console
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    // Stop before calling onSnapshot
    return;
  }

  // Build the same newest-first query used by the one-time read
  const q = query(
    // ratings lives under restaurants/{restaurantId} on the client database
    collection(db, "restaurants", restaurantId, "ratings"),
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

// Write a batch of generated restaurants, each with its own reviews
export async function addFakeRestaurantsAndReviews() {
  // Generate the sample restaurants and the reviews that belong to each one
  const data = await generateFakeRestaurantsAndReviews();
  // Handle one restaurant and its reviews at a time
  for (const { restaurantData, ratingsData } of data) {
    // Keep going with the next restaurant if this write fails
    try {
      // Add the restaurant document and keep the reference Firestore returns
      const docRef = await addDoc(
        // Write into the top-level restaurants collection
        collection(db, "restaurants"),
        // Fields for this generated restaurant
        restaurantData
      );

      // Write each review into that restaurant's ratings subcollection
      for (const ratingData of ratingsData) {
        // Wait for this review document to be created before the next one
        await addDoc(
          // Subcollection path uses the id of the restaurant just created
          collection(db, "restaurants", docRef.id, "ratings"),
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
