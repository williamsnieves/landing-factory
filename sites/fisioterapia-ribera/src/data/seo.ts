/**
 * Structured data and the Open Graph image of the home page.
 *
 * JSON-LD carries only facts the brief does not list as assumed: the business description and the service area.
 * Name, telephone, email, address and opening hours are all assumed in this prospect brief, so they stay out of the
 * markup until the business confirms them. No review or rating markup: the brief has no reviews.
 */
import { getImage } from 'astro:assets';
import heroPhoto from '../assets/images/hero-tratamiento-pierna.jpg';
import { business } from './site';

export interface MedicalClinicJsonLd {
  '@context': 'https://schema.org';
  '@type': 'MedicalClinic';
  description: string;
  areaServed: { '@type': 'City'; name: string };
}

export const jsonLd: MedicalClinicJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  description: business.description,
  areaServed: { '@type': 'City', name: 'Zaragoza' },
};

const og = await getImage({
  src: heroPhoto,
  // A 4:5 crop from the left edge keeps the branded socks and the blurred background person out of the picture.
  width: 960,
  height: 1200,
  fit: 'cover',
  position: 'left',
  format: 'jpg',
});

/** Root-relative URL of the Open Graph image (a 960 x 1200 crop of the hero photo). */
export const ogImage: string = og.src;
