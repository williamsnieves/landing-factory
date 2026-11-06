// Structured data (schema.org JSON-LD) and the Open Graph image of the home page.
// Customer facts only: the brief's phone, email, address and hours are sample data for this prospect, so they are left
// out, and there is no review or rating markup (the brief has no proof).
import { getImage } from 'astro:assets';
import { business, seo } from '../content/site';
import photo from '../assets/images/manos-espalda.jpg';

export interface MedicalClinicJsonLd {
  '@context': 'https://schema.org';
  '@type': 'MedicalClinic';
  name: string;
  description: string;
  areaServed: { '@type': 'City'; name: string };
  medicalSpecialty: 'PhysicalTherapy';
}

export const jsonLd: MedicalClinicJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: business.name,
  description: seo.description,
  areaServed: { '@type': 'City', name: business.city },
  medicalSpecialty: 'PhysicalTherapy',
};

const og = await getImage({ src: photo, width: 1200, format: 'jpg' });

/** Root-relative URL of the Open Graph image (absolute once `site` is set at hand-off). */
export const ogImage: string = og.src;
