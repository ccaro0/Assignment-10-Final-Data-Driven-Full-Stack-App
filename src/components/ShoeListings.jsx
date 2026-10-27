"use client";

// This component handles the shoe listings page
// It receives data from src/app/page.js, such as the initial shoes and search params from the URL

import Link from "next/link";
import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import renderStars from "@/src/components/Stars.jsx";
import { getShoesSnapshot } from "@/src/lib/firebase/firestore.js";
import Filters from "@/src/components/Filters.jsx";

const ShoeItem = ({ shoe }) => (
  <li key={shoe.id}>
    <Link href={`/shoe/${shoe.id}`}>
      <ActiveShoe shoe={shoe} />
    </Link>
  </li>
);

const ActiveShoe = ({ shoe }) => (
  <div>
    <ImageCover photo={shoe.photo} name={shoe.name} />
    <ShoeCardDetails shoe={shoe} />
  </div>
);

const ImageCover = ({ photo, name }) => (
  <div className="image-cover">
    <img src={photo} alt={name} />
  </div>
);

const ShoeCardDetails = ({ shoe }) => (
  <div className="shoe__details">
    <h2>{shoe.name}</h2>
    <ShoeRating shoe={shoe} />
    <ShoeMetadata shoe={shoe} />
  </div>
);

const ShoeRating = ({ shoe }) => (
  <div className="shoe__rating">
    <ul>{renderStars(shoe.avgRating)}</ul>
    <span>({shoe.numRatings})</span>
  </div>
);

const ShoeMetadata = ({ shoe }) => (
  <div className="shoe__meta">
    <p>
      {shoe.category} | {shoe.brand}
    </p>
    <p>{"$".repeat(shoe.price)}</p>
  </div>
);

export default function ShoeListings({ initialShoes, searchParams }) {
  const router = useRouter();

  // The initial filters are the search params from the URL, useful for when the user refreshes the page
  const initialFilters = {
    brand: searchParams.brand || "",
    category: searchParams.category || "",
    price: searchParams.price || "",
    sort: searchParams.sort || "",
  };

  const [shoes, setShoes] = useState(initialShoes);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    routerWithFilters(router, filters);
  }, [router, filters]);

  useEffect(() => {
    return getShoesSnapshot((data) => {
      setShoes(data);
    }, filters);
  }, [filters]);

  return (
    <article>
      <Filters filters={filters} setFilters={setFilters} />
      <ul className="shoes">
        {shoes.map((shoe) => (
          <ShoeItem key={shoe.id} shoe={shoe} />
        ))}
      </ul>
    </article>
  );
}

function routerWithFilters(router, filters) {
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value);
    }
  }

  const queryString = queryParams.toString();
  router.push(`?${queryString}`);
}
