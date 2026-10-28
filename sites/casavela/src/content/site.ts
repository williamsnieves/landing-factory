// Customer facts from sites/casavela/brief.json, shared by every page. Fields the brief lists as `assumed`
// (business name, contact data, the WhatsApp and phone numbers, the offer) are sample values to confirm:
// pages show `sampleNotice` wherever they show them and never present them as confirmed facts.

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
    hours: string;
  };
  serviceArea: string[];
  audience: { who: string; needs: string; objections: string };
  /** Required notice from `legal.notices` in the brief, shown next to the mortgage calculator. */
  calculatorNotice: string;
  /** Shown on every page that shows the assumed fields. */
  sampleNotice: string;
  draftNotice: string;
}

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
    address: 'Calle de Ejemplo 12, 46001 Valencia',
    hours: 'Lunes a viernes de 9:30 a 14:00 y de 16:30 a 19:30',
  },
  serviceArea: ['Valencia', 'Burjassot', 'Paterna', 'Mislata'],
  audience: {
    who: 'Propietarios de Valencia y área metropolitana que piensan vender, y compradores que necesitan hipoteca.',
    needs:
      'Saber cuánto vale su vivienda, venderla sin perder tiempo y entender cuánto pueden pedir de hipoteca.',
    objections:
      'Desconfianza de las inmobiliarias, comisiones poco claras y miedo a tasaciones a la baja.',
  },
  calculatorNotice:
    'La calculadora es orientativa: no es una oferta vinculante ni asesoramiento financiero personalizado.',
  sampleNotice:
    'Datos de ejemplo pendientes de confirmar: nombre comercial, servicios, teléfono, WhatsApp, correo, dirección y horario.',
  draftNotice:
    'Borrador de dirección visual para elegir el estilo de la página. No es la página final.',
};
