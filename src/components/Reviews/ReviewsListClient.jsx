"use client";

import React, { useState, useEffect } from "react";
import { getReviewsSnapshotByShoeId } from "@/src/lib/firebase/firestore.js";
import { Review } from "@/src/components/Reviews/Review";

export default function ReviewsListClient({
  initialReviews,
  shoeId,
  userId,
}) {
  const [reviews, setReviews] = useState(initialReviews);

  useEffect(() => {
    return getReviewsSnapshotByShoeId(shoeId, (data) => {
      setReviews(data);
    });
  }, [shoeId]);
  return (
    <article>
      <ul className="reviews">
        {reviews.length > 0 ? (
          <ul>
            {reviews.map((review) => (
              <Review
                key={review.id}
                rating={review.rating}
                text={review.text}
                timestamp={review.timestamp}
              />
            ))}
          </ul>
        ) : (
          <p>
            This shoe has not been reviewed yet,{" "}
            {!userId ? "first login and then" : ""} add your own review!
          </p>
        )}
      </ul>
    </article>
  );
}
