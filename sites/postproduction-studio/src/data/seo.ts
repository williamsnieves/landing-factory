// Structured data for the home page (schema.org ProfessionalService, assumed type; no brief). Only what the page
// itself states: the name, the description and the four services. The sample email and the assumed city are left
// out, and there is no review or rating markup.
import { brand, seo, services } from '../content/site';

interface Offer {
  '@type': 'Offer';
  itemOffered: { '@type': 'Service'; name: string; description: string };
}

interface ProfessionalService {
  '@context': 'https://schema.org';
  '@type': 'ProfessionalService';
  name: string;
  description: string;
  makesOffer: Offer[];
}

export const jsonLd: ProfessionalService = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: brand.name,
  description: seo.description,
  makesOffer: services.map((service) => ({
    '@type': 'Offer',
    itemOffered: {
      '@type': 'Service',
      name: service.name,
      description: service.summary,
    },
  })),
};
