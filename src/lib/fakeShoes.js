import {
  randomNumberBetween,
  getRandomDateAfter,
  getRandomDateBefore,
} from "@/src/lib/utils.js";
import { randomData } from "@/src/lib/randomData.js";

import { Timestamp } from "firebase/firestore";

export async function generateFakeShoesAndReviews() {
  const shoesToAdd = 5;
  const data = [];
  const availablePhotos = [...randomData.shoePhotos];

  for (let i = 0; i < shoesToAdd; i++) {
    const shoeTimestamp = Timestamp.fromDate(getRandomDateBefore());

    const ratingsData = [];

    // Generate a random number of ratings/reviews for this shoe
    for (let j = 0; j < randomNumberBetween(0, 5); j++) {
      const ratingTimestamp = Timestamp.fromDate(
        getRandomDateAfter(shoeTimestamp.toDate())
      );

      const ratingData = {
        rating:
          randomData.shoeReviews[
            randomNumberBetween(0, randomData.shoeReviews.length - 1)
          ].rating,
        text: randomData.shoeReviews[
          randomNumberBetween(0, randomData.shoeReviews.length - 1)
        ].text,
        userId: `User #${randomNumberBetween()}`,
        timestamp: ratingTimestamp,
      };

      ratingsData.push(ratingData);
    }

    const avgRating = ratingsData.length
      ? ratingsData.reduce(
          (accumulator, currentValue) => accumulator + currentValue.rating,
          0
        ) / ratingsData.length
      : 0;

    const brand =
      randomData.shoeBrands[
        randomNumberBetween(0, randomData.shoeBrands.length - 1)
      ];
    const brandStyles = randomData.shoesByBrand[brand];
    const style =
      brandStyles[randomNumberBetween(0, brandStyles.length - 1)];

    const shoeData = {
      category: style.category,
      name: style.name,
      avgRating,
      brand,
      numRatings: ratingsData.length,
      sumRating: ratingsData.reduce(
        (accumulator, currentValue) => accumulator + currentValue.rating,
        0
      ),
      price: style.price,
      photo: availablePhotos.splice(
        randomNumberBetween(0, availablePhotos.length - 1),
        1
      )[0],
      timestamp: shoeTimestamp,
    };

    data.push({
      shoeData,
      ratingsData,
    });
  }
  return data;
}
