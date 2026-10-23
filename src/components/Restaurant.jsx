// Mark this file as a Client Component so it can use state, effects, and browser events
"use client";

// This component shows one individual restaurant
// It receives data from src/app/restaurant/[id]/page.jsx

// Load React state, the effect hook, and Suspense for the lazily loaded dialog
import { React, useState, useEffect, Suspense } from "react";
// Load Next.js dynamic import so the dialog is fetched only when needed
import dynamic from "next/dynamic";
// Load the live listener that updates this restaurant when Firestore changes
import { getRestaurantSnapshotById } from "@/src/lib/firebase/firestore.js";
// Load the hook that reads the signed-in user in the browser
import { useUser } from "@/src/lib/getUser";
// Load the presentational component that renders the photo, name, and actions
import RestaurantDetails from "@/src/components/RestaurantDetails.jsx";
// Load the helper that uploads a new photo and returns its public URL
import { updateRestaurantImage } from "@/src/lib/firebase/storage.js";

// Load the review dialog in a separate chunk instead of the main page bundle
const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx"));

// Restaurant renders one restaurant page and owns its live data and review draft
export default function Restaurant({
  id, // Firestore id of the restaurant in the URL
  initialRestaurant, // restaurant fields rendered on the server before the listener runs
  initialUserId, // user id known on the server, used until the client auth listener settles
  children, // server-rendered content such as the Gemini summary
}) {
  // Start with the server data, then replace it when the snapshot listener fires
  const [restaurantDetails, setRestaurantDetails] = useState(initialRestaurant);
  // The review dialog stays closed until the user clicks the review icon
  const [isOpen, setIsOpen] = useState(false);

  // The only reason this component needs to know the user ID is to associate a review with the user, and to know whether to show the review dialog
  const userId = useUser()?.uid || initialUserId;
  // Draft review starts with no stars and an empty comment
  const [review, setReview] = useState({
    rating: 0, // selected star count
    text: "", // written review, still empty
  });

  // Update one field of the draft without dropping the other field
  const onChange = (value, name) => {
    // Copy the current draft and overwrite the named field
    setReview({ ...review, [name]: value });
  };

  // Upload a replacement photo and show it immediately
  async function handleRestaurantImage(target) {
    // Use the first selected file, or null when the input is empty
    const image = target.files ? target.files[0] : null;
    // Do nothing when the user cancels the file picker
    if (!image) {
      return;
    }

    // Upload the file and wait for its public download URL
    const imageURL = await updateRestaurantImage(id, image);
    // Replace the photo on the current restaurant object so the new image appears
    setRestaurantDetails({ ...restaurantDetails, photo: imageURL });
  }

  // Close the dialog and throw away the unsaved draft
  const handleClose = () => {
    // Hide the review dialog
    setIsOpen(false);
    // Reset stars and text so the next open starts blank
    setReview({ rating: 0, text: "" });
  };

  // Subscribe to this restaurant and drop the subscription when the id changes or the component unmounts
  useEffect(() => {
    // The returned function is the Firestore unsubscribe callback
    return getRestaurantSnapshotById(id, (data) => {
      // Store each live update as the restaurant currently on screen
      setRestaurantDetails(data);
    });
  }, [id]); // resubscribe only when the restaurant id changes

  // Render the details, the server children, and the review dialog for a signed-in user
  return (
    <>
      {/* Details receives the live restaurant and the handlers for photo and review */}
      <RestaurantDetails
        restaurant={restaurantDetails} // current restaurant fields
        userId={userId} // controls whether review and upload actions appear
        handleRestaurantImage={handleRestaurantImage} // runs when a new photo is chosen
        setIsOpen={setIsOpen} // lets the details view open the dialog
        isOpen={isOpen} // current open state of the dialog
      >
        {/* Server-rendered children, including the review summary */}
        {children}
      </RestaurantDetails>
      {/* Only a signed-in user gets the dialog that can submit a review */}
      {userId && (
        // Show a short fallback while the dialog chunk is still downloading
        <Suspense fallback={<p>Loading...</p>}>
          <ReviewDialog
            isOpen={isOpen} // whether the modal should be shown
            handleClose={handleClose} // close and clear the draft
            review={review} // current star and text draft
            onChange={onChange} // update one draft field
            userId={userId} // author stored on the new review
            id={id} // restaurant stored on the new review
          />
        </Suspense>
      )}
    </>
  );
}
