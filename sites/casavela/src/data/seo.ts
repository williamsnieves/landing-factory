// Structured data of the home page (schema.org RealEstateAgent, the brief's seo.schemaType), built from the
// brief's customer facts only: description, city, country and service area. The brief lists the business name,
// telephone, email, address and hours as `assumed`, so they are left out here (never filled in); add `name`,
// `telephone`, `email`, `address.streetAddress`, `address.postalCode` and `openingHoursSpecification` once the
// customer confirms them. No `url` while deploy.domain is empty, and no review or rating markup (none in the brief).

import { getImage } from 'astro:assets';
import facade from '../assets/images/fachada-valencia.jpg';
import { site } from '../content/site';

export const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  description: site.description,
  address: {
    '@type': 'PostalAddress',
    addressLocality: site.city,
    addressCountry: 'ES',
  },
  areaServed: site.serviceArea.map((name) => ({ '@type': 'City', name })),
};

/**
 * Open Graph image: a 1200 x 630 JPEG crop of the Valencia facade, taken from the top so the house-number plate
 * never shows. (The street photograph cannot be used here: a 1.9:1 crop would show its lettered banner.)
 */
const og = await getImage({
  src: facade,
  width: 1200,
  height: 630,
  fit: 'cover',
  position: 'top',
  format: 'jpg',
  quality: 70,
});
export const ogImage = og.src;
