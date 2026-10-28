// Copy of visual direction "c" (Spanish). Customer facts come from src/content/site.ts; this module holds only
// the direction's own wording: headings, labels and the hero photo's alt text. No figures other than brief facts
// (free valuation, number of services, number of municipalities), and every value the brief lists as assumed is
// marked as sample data where it is shown.

import { site, type Action } from '../../../content/site';

export interface Stat {
  figure: string;
  unit: string;
  label: string;
  /** Where the figure comes from; sample values say so. */
  source: string;
}

export interface PracticalItem {
  id: 'donde' | 'cuando' | 'como';
  label: string;
  value: string;
  /** Optional links (phone, WhatsApp) shown under the value. */
  links?: Action[];
}

const valuation = site.offers.find((offer) => offer.price);

export const sampleTag = 'Dato de ejemplo';

export const meta = {
  title: 'Casavela: tu inmobiliaria de barrio en Valencia',
  description:
    'Dirección visual C: valoración de vivienda gratis en Valencia, venta y asesoría hipotecaria, con dirección, horario y teléfono a la vista.',
};

export const header = {
  nav: [
    { label: 'Servicios', href: '#c-servicios' },
    { label: 'Horario', href: '#c-practico' },
    { label: 'Contacto', href: '#c-contacto' },
  ] satisfies Action[],
  cta: 'WhatsApp',
  phoneLabel: 'Tel.',
};

export const hero = {
  eyebrow: `Inmobiliaria y asesoría hipotecaria de barrio · ${site.city}`,
  title: 'Valoramos tu vivienda en Valencia, gratis y de cerca.',
  lead: 'Un asesor visita tu casa y te da un precio de venta realista. Si decides vender, te acompañamos hasta la notaría; si compras, también con la hipoteca.',
  callPrefix: 'o llámanos al',
  contactNote: 'Teléfono y WhatsApp de ejemplo, pendientes de confirmar.',
  photoAlt:
    'Balcones de hierro con plantas y azulejos en la fachada soleada de un edificio del centro de Valencia',
  photoCaption: 'Una calle del centro de Valencia',
};

export const practical = {
  title: 'Dónde, cuándo y cómo encontrarnos',
  items: [
    { id: 'donde', label: 'Dónde', value: site.contact.address },
    { id: 'cuando', label: 'Cuándo', value: site.contact.hours },
    {
      id: 'como',
      label: 'Cómo',
      value: site.contact.phone,
      links: [
        { label: 'Llamar', href: site.contact.phoneHref },
        { label: 'Escribir por WhatsApp', href: site.primary.href },
      ],
    },
  ] satisfies PracticalItem[],
  statsTitle: 'En cifras, y de dónde salen',
};

export const stats: Stat[] = [
  {
    figure: '0',
    unit: '€',
    label: 'cuesta la valoración de tu vivienda',
    source: `Fuente: lista de servicios (${valuation?.price ?? ''}) · ejemplo por confirmar`,
  },
  {
    figure: String(site.offers.length),
    unit: 'servicios',
    label: 'valoración, venta y asesoría hipotecaria',
    source: 'Fuente: lista de servicios · ejemplo por confirmar',
  },
  {
    figure: String(site.serviceArea.length),
    unit: 'municipios',
    label: site.serviceArea.join(', '),
    source: 'Fuente: zona de servicio del negocio',
  },
];

export const services = {
  eyebrow: 'Servicios',
  title: 'Tres servicios, explicados en claro',
  line: 'Empieza por saber cuánto vale tu vivienda. Después decides tú.',
  freeLabel: 'Gratis',
  ask: 'Preguntar por WhatsApp',
  areaTitle: 'Dónde trabajamos',
  areaLine: 'Valencia y su área metropolitana:',
  hoursTitle: 'Horario',
  closingTitle: '¿Cuánto vale tu vivienda?',
  closingLine: 'Escríbenos y quedamos para la valoración.',
  callPrefix: 'o llámanos al',
};

export const footer = {
  contactTitle: 'Contacto',
  areaTitle: 'Zona de servicio',
  linksTitle: 'Enlaces',
  phoneLabel: 'Tel.',
  emailLabel: 'Correo',
  back: 'Ver todas las direcciones',
  photoLine: 'Foto de la portada:',
};
