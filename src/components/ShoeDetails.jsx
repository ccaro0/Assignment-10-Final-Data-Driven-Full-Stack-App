// This component shows shoe metadata, and offers some actions to the user like uploading a new shoe image, and adding a review.

import React from "react";
import renderStars from "@/src/components/Stars.jsx";

const ShoeDetails = ({
  shoe,
  userId,
  handleShoeImage,
  setIsOpen,
  isOpen,
  children,
}) => {
  return (
    <section className="img__section">
      <img src={shoe.photo} alt={shoe.name} />

      <div className="actions">
        {userId && (
          <img
            alt="review"
            className="review"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            src="/review.svg"
          />
        )}
        <label
          onChange={(event) => handleShoeImage(event.target)}
          htmlFor="upload-image"
          className="add"
        >
          <input
            name=""
            type="file"
            id="upload-image"
            className="file-input hidden w-full h-full"
          />

          <img className="add-image" src="/add.svg" alt="Add image" />
        </label>
      </div>

      <div className="details__container">
        <div className="details">
          <h2>{shoe.name}</h2>

          <div className="shoe__rating">
            <ul>{renderStars(shoe.avgRating)}</ul>

            <span>({shoe.numRatings})</span>
          </div>

          <p>
            {shoe.category} | {shoe.brand}
          </p>
          <p>{"$".repeat(shoe.price)}</p>
          {children}
        </div>
      </div>
    </section>
  );
};

export default ShoeDetails;
