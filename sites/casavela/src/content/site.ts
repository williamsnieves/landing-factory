// Customer facts from sites/casavela/brief.json, shared by every page. Fields the brief lists as `assumed`
// (business name, contact data, the WhatsApp and phone numbers, the offer) are sample values to confirm: pages
// show a "dato de ejemplo" tag beside them (never inside the element that holds the fact) and the footer carries
// `sampleNotice`.

export interface Offer {
  name: string;
  description: string;
  /** Only the free valuation has a price in the brief. */
  price?: string;
}

export interface Action {
  label: string;
  href: string;
}

/** One stretch of the working day, as 24 h "H:MM" strings. */
export interface OpeningSpan {
  label: string;
  from: string;
  to: string;
}

export interface Site {
  name: string;
  city: string;
  description: string;
  offers: Offer[];
  primary: Action;
  secondary: Action;
  contact: {
    email: string;
    phone: string;
    phoneHref: string;
    address: string;
    streetAddress: string;
    postalCode: string;
    /** Plain search link to a public map (no embed, no third-party script). */
    mapHref: string;
    hours: string;
    /** The days `hours` covers, and the two stretches of the split working day (from `contact.hours`). */
    days: string;
    spans: OpeningSpan[];
  };
  serviceArea: string[];
  /** Required notice from `legal.notices` in the brief, shown next to the mortgage calculator. */
  calculatorNotice: string;
  /** Footer notice for the assumed fields. */
  sampleNotice: string;
  /** Short tag placed beside a sample value. */
  sampleTag: string;
}

const address = 'Calle de Ejemplo 12, 46001 Valencia';

export const site: Site = {
  name: 'Casavela Inmobiliaria',
  city: 'Valencia',
  description:
    'Inmobiliaria y asesoría hipotecaria de barrio en Valencia: valoramos tu vivienda gratis, te ayudamos a venderla al mejor precio y acompañamos a compradores con su hipoteca de principio a fin.',
  offers: [
    {
      name: 'Valoración gratuita de tu vivienda',
      description:
        'Un asesor visita tu vivienda y te da un precio de venta realista basado en ventas recientes de tu zona.',
      price: 'Gratis',
    },
    {
      name: 'Venta de tu vivienda',
      description:
        'Fotografía, publicación, visitas filtradas y negociación hasta la firma en notaría.',
    },
    {
      name: 'Asesoría hipotecaria',
      description:
        'Comparamos ofertas de varios bancos y te acompañamos en la tasación y la firma.',
    },
  ],
  primary: {
    label: 'Pide tu valoración gratuita por WhatsApp',
    href: 'https://wa.me/34600000000',
  },
  secondary: { label: 'Llámanos', href: 'tel:+34600000000' },
  contact: {
    email: 'hola@example.com',
    phone: '+34 600 000 000',
    phoneHref: 'tel:+34600000000',
    address,
    streetAddress: 'Calle de Ejemplo 12',
    postalCode: '46001',
    mapHref: `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`,
    hours: 'Lunes a viernes de 9:30 a 14:00 y de 16:30 a 19:30',
    days: 'Lunes a viernes',
    spans: [
      { label: 'Mañana', from: '9:30', to: '14:00' },
      { label: 'Tarde', from: '16:30', to: '19:30' },
    ],
  },
  serviceArea: ['Valencia', 'Burjassot', 'Paterna', 'Mislata'],
  calculatorNotice:
    'La calculadora es orientativa: no es una oferta vinculante ni asesoramiento financiero personalizado.',
  sampleNotice:
    'Datos de ejemplo pendientes de confirmar: nombre comercial, servicios, teléfono, WhatsApp, correo, dirección y horario.',
  sampleTag: 'Dato de ejemplo',
};
