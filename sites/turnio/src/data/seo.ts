/**
 * Structured data (schema.org JSON-LD) for the home page: SoftwareApplication with the three plans as offers.
 * Customer facts only (brief.json). No rating or review markup: the brief has no reviews.
 */
import { plans } from './plans';

interface Offer {
  '@type': 'Offer';
  name: string;
  price: number;
  priceCurrency: 'EUR';
  url: string;
}

interface SoftwareApplication {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  applicationCategory: 'BusinessApplication';
  operatingSystem: string;
  offers: Offer[];
}

export const softwareApplication: SoftwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Turnio',
  description:
    'Turnio es un software de reservas online para peluquerías y centros de estética: tus clientes reservan desde un enlace o Instagram a cualquier hora, la agenda se llena sola y cada cita recibe un recordatorio por WhatsApp para que nadie se olvide.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: plans.map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    price: plan.amount,
    priceCurrency: 'EUR',
    url: plan.url,
  })),
};
