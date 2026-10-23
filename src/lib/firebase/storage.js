// Load the Storage helpers that point at a file, upload it, and read its public URL
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Load the client-side Storage bucket used by browser uploads
import { storage } from "@/src/lib/firebase/clientApp";

// Load the helper that saves the new photo URL onto the restaurant document
import { updateRestaurantImageReference } from "@/src/lib/firebase/firestore";

// Upload a restaurant photo, save its URL in Firestore, and return that URL
export async function updateRestaurantImage(restaurantId, image) {
  // Keep going to the error log if the id, the file, or the upload fails
  try {
    // Refuse to upload when the caller did not name a restaurant
    if (!restaurantId) {
      throw new Error("No restaurant ID has been provided.");
    }

    // Refuse to upload when the file is missing or has no name
    if (!image || !image.name) {
      throw new Error("A valid image has not been provided.");
    }

    // Upload the file and wait for the public download URL
    const publicImageUrl = await uploadImage(restaurantId, image);
    // Write that URL into the restaurant document's photo field
    await updateRestaurantImageReference(restaurantId, publicImageUrl);

    // Hand the URL back so the page can show the new photo immediately
    return publicImageUrl;
  } catch (error) {
    // Print the failure without throwing it to the click handler
    console.error("Error processing request:", error);
  }
}

// Put one image in Cloud Storage and return the URL browsers can load
async function uploadImage(restaurantId, image) {
  // Store the file under images/{restaurantId}/{original file name}
  const filePath = `images/${restaurantId}/${image.name}`;
  // Point at that path in the default Storage bucket
  const newImageRef = ref(storage, filePath);
  // Upload the file bytes and wait until Storage finishes
  await uploadBytesResumable(newImageRef, image);

  // Read and return the public URL of the file that was just uploaded
  return await getDownloadURL(newImageRef);
}
