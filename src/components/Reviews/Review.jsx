import renderStars from "@/src/components/Stars.jsx";

export function Review({ rating, text, timestamp }) {
  return (
    <li className="review__item">
      <ul className="shoe__rating">{renderStars(rating)}</ul>
      <p>{text}</p>



      <time>
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(timestamp))}
      </time>

    </li>
  );
}

export function ReviewSkeleton() {
  return (
    <li className="review__item">
      <div className="shoe__rating">
        <div
          style={{
            height: "2rem",
            backgroundColor: "rgb(156 163 175)",
            width: "10rem",
          }}
        ></div>
      </div>
      <div
        style={{
          height: "19px",
          backgroundColor: "rgb(156 163 175)",
          width: "12rem",
        }}
      ></div>
      <p>{"   "}</p>
    </li>
  );
}
