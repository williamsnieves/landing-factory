// Copy of visual direction "b" (Spanish). Customer facts come from src/content/site.ts; this module holds only
// the direction's own wording: headings, labels and placeholders. No figures here other than brief facts, and
// every value the brief lists as assumed is marked as a sample.

import { site, type Action } from '../../../content/site';

export interface Stat {
  figure: string;
  unit: string;
  label: string;
  /** Where the figure comes from; sample values say so. */
  source: string;
}

export interface ServiceRow {
  name: string;
  forWhom: string;
  includes: string;
  price: string;
  /** True when the price is a placeholder, not a brief fact. */
  pricePending: boolean;
  action: Action;
}

const [valuation, sale, mortgage] = site.offers;

export const meta = {
  title: 'Casavela: valoración gratis, sin letra pequeña',
  description:
    'Dirección visual B: valoración de vivienda gratis en Valencia y una tabla que dice qué incluye cada servicio y qué falta por confirmar.',
};

export const header = {
  nav: [
    { label: 'Servicios', href: '#b-servicios' },
    { label: 'Contacto', href: '#b-contacto' },
  ] satisfies Action[],
  cta: 'Valoración gratis',
};

export const hero = {
  index: '[00] Portada',
  place: `${site.city} · ${site.serviceArea.length} municipios`,
  titleLead: 'Sin letra',
  titleMark: 'pequeña.',
  lineLabel: '[01] Qué hacemos',
  line: 'Valoración de vivienda gratis en Valencia, venta y asesoría hipotecaria. Qué incluye cada servicio y qué falta por confirmar, a la vista y en una sola tabla.',
};

export const statsLabel = '[02] Cifras y de dónde salen';

export const stats: Stat[] = [
  {
    figure: '0',
    unit: '€',
    label: 'cuesta la valoración de tu vivienda',
    source: 'Fuente: lista de servicios · ejemplo por confirmar',
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

const owners = 'Propietarios que piensan vender';

export const services = {
  index: '[03] Servicios',
  title: 'Qué incluye cada servicio',
  line: 'Tres servicios y las mismas preguntas para los tres. Lo que todavía no está confirmado lo marcamos como tal.',
  tableLabel:
    'Comparativa de los tres servicios: para quién es, qué incluye, precio y cómo empezar',
  columns: {
    name: 'Servicio',
    forWhom: 'Para quién',
    includes: 'Qué incluye',
    price: 'Precio',
    action: 'Cómo empezar',
  },
  pendingTag: 'Dato de ejemplo',
  rows: [
    {
      name: valuation?.name ?? '',
      forWhom: owners,
      includes: valuation?.description ?? '',
      price: valuation?.price ?? 'A confirmar',
      pricePending: true,
      action: { label: 'Pedir por WhatsApp', href: site.primary.href },
    },
    {
      name: sale?.name ?? '',
      forWhom: owners,
      includes: sale?.description ?? '',
      price: 'A confirmar',
      pricePending: true,
      action: { label: 'Empezar por la valoración', href: site.primary.href },
    },
    {
      name: mortgage?.name ?? '',
      forWhom: 'Compradores que necesitan hipoteca',
      includes: mortgage?.description ?? '',
      price: 'A confirmar',
      pricePending: true,
      action: { label: site.secondary.label, href: site.secondary.href },
    },
  ] satisfies ServiceRow[],
  feesLabel: 'Honorarios',
  fees: 'Pendientes de confirmar.',
  closingTitle: 'Empieza por saber cuánto vale tu vivienda.',
};

export const footer = {
  index: '[04] Contacto',
  contactTitle: 'Contacto',
  areaTitle: 'Zona de servicio',
  draftTitle: 'Borrador',
  phoneLabel: 'Tel.',
  emailLabel: 'Correo',
  back: 'Ver todas las direcciones',
};
