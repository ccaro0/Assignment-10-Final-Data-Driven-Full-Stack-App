// Mark this file as a Client Component so it can use refs and browser dialog APIs
"use client";

// This component shows the review dialog and submits it with a Next.js Server Action

// Load the hooks that run effects and hold a reference to the dialog element
import { useEffect, useLayoutEffect, useRef } from "react";
// Load the star picker the user clicks before writing a review
import RatingPicker from "@/src/components/RatingPicker.jsx";
// Load the Server Action that writes the submitted review to Firestore
import { handleReviewFormSubmission } from "@/src/app/actions.js";

// ReviewDialog receives open state, the current draft, and the ids needed to save it
const ReviewDialog = ({
  isOpen, // true when the parent wants the modal visible
  handleClose, // function that closes the dialog and clears the draft
  review, // current rating and text controlled by the parent
  onChange, // function that updates one field of the draft review
  userId, // signed-in user id stored with the review
  id, // restaurant id stored with the review
}) => {
  // Keep a reference to the native <dialog> element
  const dialog = useRef();

  // dialogs only render their backdrop when called with `showModal`
  useLayoutEffect(() => {
    // Open the modal when the parent sets isOpen to true
    if (isOpen) {
      // showModal displays the dialog and its backdrop
      dialog.current.showModal();
    } else {
      // close hides the dialog when the parent sets isOpen to false
      dialog.current.close();
    }
  }, [isOpen, dialog]); // rerun when open state or the dialog ref changes

  // Handle a mouse click anywhere inside the dialog element
  const handleClick = (e) => {
    // close if clicked outside the modal
    if (e.target === dialog.current) {
      // A click on the backdrop itself should dismiss the dialog
      handleClose();
    }
  };

  // Render the native dialog and the review form inside it
  return (
    // Attach the ref and close the dialog when the backdrop is clicked
    <dialog ref={dialog} onMouseDown={handleClick}>
      {/* The form posts to the Server Action and then closes the dialog */}
      <form
        action={handleReviewFormSubmission}
        onSubmit={() => {
          // Close the dialog as soon as the user submits
          handleClose();
        }}
      >
        {/* Title row at the top of the dialog */}
        <header>
          {/* Heading the user sees above the form */}
          <h3>Add your review</h3>
        </header>
        {/* Body of the form: stars, text, and hidden ids */}
        <article>
          {/* Star control that writes the rating into the form */}
          <RatingPicker />

          {/* Text field for the written part of the review */}
          <p>
            <input
              type="text" // single-line text input
              name="text" // form field name the Server Action reads
              id="review" // id used to associate a label with this input
              placeholder="Write your thoughts here" // hint shown before the user types
              required // browser blocks submit when this field is empty
              value={review.text} // controlled value from the parent draft
              onChange={(e) => onChange(e.target.value, "text")} // save each keystroke as the text field
            />
          </p>

          {/* Hidden field so the Server Action knows which restaurant was reviewed */}
          <input type="hidden" name="restaurantId" value={id} />
          {/* Hidden field so the Server Action knows which user wrote the review */}
          <input type="hidden" name="userId" value={userId} />
        </article>
        {/* Button row at the bottom of the dialog */}
        <footer>
          {/* Group the cancel and submit buttons */}
          <menu>
            <button
              autoFocus // focus this button when the dialog opens
              type="reset" // reset clears the form fields
              onClick={handleClose} // cancel also closes the dialog
              className="button--cancel" // cancel button style
            >
              Cancel
            </button>
            <button type="submit" value="confirm" className="button--confirm">
              Submit
            </button>
          </menu>
        </footer>
      </form>
    </dialog>
  );
};

// Let other files import this component as the default export
export default ReviewDialog;
