// Copy of visual direction "a" (Spanish). Customer facts come from src/content/site.ts; this module holds only
// the direction's own wording: headings, explanations and labels. No figures here other than brief facts.

import { site } from '../../../content/site';

export interface Block {
  title: string;
  body: string;
}

export interface Stat {
  figure: string;
  label: string;
  /** Where the figure comes from; sample values say so. */
  source: string;
}

const valuation = site.offers[0];

export const meta = {
  title: 'Casavela: valoración gratis y calculadora hipotecaria',
  description:
    'Dirección visual A: valoración de vivienda gratis en Valencia y una calculadora hipotecaria orientativa que te acompaña mientras lees.',
};

export const header = {
  tagline: 'Inmobiliaria y asesoría hipotecaria · Valencia',
  cta: 'Valoración gratuita',
};

export const hero = {
  eyebrow: 'Valoración de vivienda gratis en Valencia',
  lead: 'Conoce el valor real de tu vivienda.',
  rest: 'Y entiende tu hipoteca antes de firmar, con un equipo de barrio que te lo explica todo.',
  line: valuation.description,
};

export const card = {
  label: 'Tu valoración',
  title: valuation.name,
  price: valuation.price ?? '',
  stepsTitle: 'Qué pasa en la visita',
  steps: [
    'Nos escribes por WhatsApp y acordamos el día.',
    'Un asesor visita tu vivienda.',
    'Recibes un precio de venta realista basado en ventas recientes de tu zona.',
  ],
  areaTitle: 'Zona de servicio',
};

export const stats: Stat[] = [
  {
    figure: '0 €',
    label: 'cuesta la valoración de tu vivienda',
    source: 'Servicio de ejemplo, pendiente de confirmar',
  },
  {
    figure: String(site.offers.length),
    label: 'servicios: valoración, venta y asesoría hipotecaria',
    source: 'Servicios de ejemplo, pendientes de confirmar',
  },
  {
    figure: String(site.serviceArea.length),
    label: `municipios: ${site.serviceArea.join(', ')}`,
    source: 'Zona de servicio del negocio',
  },
];

export const calculator = {
  eyebrow: 'Calculadora hipotecaria',
  lead: 'Calcula una cuota orientativa.',
  rest: 'Cuatro datos y una cifra, con la explicación de cada uno al lado.',
  blocks: [
    {
      title: 'Lo que financia el banco',
      body: 'El préstamo es la diferencia entre el precio de la vivienda y lo que aportas tú. Los bancos no suelen financiar el precio completo, y cada entidad fija su propio límite según la vivienda y tu situación.',
    },
    {
      title: 'Tu aportación',
      body: 'Tus ahorros cubren la parte que el banco no financia y también los gastos de la compra, como impuestos, notaría y registro. Cuanto más aportas, menor es el préstamo y menor la cuota.',
    },
    {
      title: 'El plazo',
      body: 'Es el número de años para devolver el préstamo. Un plazo más largo baja la cuota de cada mes, pero aumenta el total de intereses que pagas al final.',
    },
    {
      title: 'El tipo de interés',
      body: 'Es lo que cuesta el dinero prestado. Puede ser fijo, variable o mixto. El que ves en la calculadora es solo un ejemplo para ver cómo cambia la cuota: el tipo real depende de cada banco y de tu perfil.',
    },
  ] satisfies Block[],
  panelTitle: 'Tu cuota orientativa',
  fields: {
    price: 'Precio de la vivienda (€)',
    savings: 'Ahorro aportado (€)',
    years: 'Plazo (años)',
    rate: 'Tipo de interés anual (%)',
    rateHint: 'Tipo de ejemplo, cámbialo',
  },
  loanLabel: 'Importe del préstamo',
  monthlyLabel: 'Cuota mensual',
  noScript:
    'Sin JavaScript el resultado no se recalcula: corresponde a los valores iniciales del formulario.',
  closingTitle: '¿Quieres comparar ofertas reales?',
  closingBody: site.offers[2]?.description ?? '',
};

export const footer = {
  contactTitle: 'Contacto',
  back: 'Ver todas las direcciones',
};
