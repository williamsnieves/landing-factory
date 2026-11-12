/**
 * JSON-LD of the home page (schema.org SoftwareApplication), passed to BaseLayout as `jsonLd`.
 * Estrato is a fictional demo project: no repository or site URL is given (none exists), and there is no review or
 * rating markup (there are no reviews). The price 0 states that the tool is free and open source.
 */
import { brand, seo } from '../content/site';

interface Offer {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
}

interface SoftwareApplication {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  softwareVersion: string;
  inLanguage: string;
  offers: Offer;
}

export const jsonLd: SoftwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: brand.name,
  description: seo.description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Linux',
  softwareVersion: brand.version.replace(/^v/, ''),
  inLanguage: 'es',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
};
