// Copy of the home page (Spanish), section by section. Customer facts come from ./site; this module holds the
// page's own wording. Regulated niche: no promise of results, no reviews, ratings, years, awards or sales figures;
// the only figures are facts of the brief (free valuation, number of services, number of municipalities).

import { site, type Action } from './site';

export interface TwoToneText {
  /** First sentence, in the full ink. */
  lead: string;
  /** Continuation, in the soft ink at the same size. */
  rest: string;
}

export interface Stat {
  figure: string;
  label: string;
  /** Where the figure comes from. */
  source: string;
}

export interface ServiceCard {
  name: string;
  description: string;
  includes: string[];
  /** "Gratis" for the valuation; the others say their fee is pending. */
  price: string;
  pricePending: boolean;
}

export interface Step {
  title: string;
  body: string;
}

export interface Question {
  question: string;
  answer: string;
}

const [valuation, sale, mortgage] = site.offers;

export const meta = {
  title: 'Valoración de vivienda gratis en Valencia · Casavela',
  description:
    'Pide tu valoración de vivienda gratis en Valencia por WhatsApp, vende con un proceso claro y calcula tu hipoteca. Valencia, Burjassot, Paterna y Mislata.',
};

export const header = {
  homeLabel: 'Casavela Inmobiliaria, inicio',
  nameFirst: 'Casavela',
  nameSecond: 'Inmobiliaria',
  nav: [
    { label: 'Valoración', href: '/#servicios' },
    { label: 'Vender', href: '/#vender' },
    { label: 'Calculadora', href: '/#calculadora' },
    { label: 'Contacto', href: '/#contacto' },
  ] satisfies Action[],
  menuLabel: 'Menú',
  callLabel: `Llamar al ${site.contact.phone}`,
  cta: 'Valoración gratis',
  ctaShort: 'WhatsApp',
};

export const hero = {
  title: {
    lead: 'Valoración de vivienda gratis en Valencia.',
    rest: 'Y tu hipoteca, bien explicada.',
  } satisfies TwoToneText,
  line: 'Pide tu valoración de vivienda gratis en Valencia por WhatsApp: un asesor visita tu casa y te da un precio de venta realista, basado en ventas recientes de tu zona.',
  contactNote: 'Teléfono y WhatsApp pendientes de confirmar.',
};

export const valuationCard = {
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

export const photoBand = {
  alt: 'Balcones de hierro con macetas, plantas colgantes y azulejos en la fachada soleada de un edificio del centro de Valencia',
  caption: 'Una calle del centro de Valencia',
  label: 'Calles de Valencia',
  facadeAlt:
    'Fachada verde de un edificio de viviendas de Valencia con ventanas de arco blancas y balcones de hierro',
  facadeCaption: 'Una fachada de Valencia',
};

export const practical = {
  title: 'Dónde, cuándo y cómo',
  note: 'Dirección, horario y contacto pendientes de confirmar.',
  where: { label: 'Dirección', mapLabel: 'Ver en el mapa (OpenStreetMap)' },
  when: { label: 'Horario' },
  how: {
    label: 'Cómo contactar',
    whatsapp: 'Escribir por WhatsApp',
    call: 'Llamar',
  },
};

export const stats: Stat[] = [
  {
    figure: '0 €',
    label: 'cuesta la valoración de tu vivienda',
    source: 'Fuente: lista de servicios (Gratis)',
  },
  {
    figure: String(site.offers.length),
    label: 'servicios: valoración, venta y asesoría hipotecaria',
    source: 'Fuente: lista de servicios',
  },
  {
    figure: String(site.serviceArea.length),
    label: `municipios: ${site.serviceArea.join(', ')}`,
    source: 'Fuente: zona de servicio',
  },
];

export const statsLabel = 'La agencia en tres cifras';

export const services = {
  title: {
    lead: 'Tres servicios.',
    rest: 'Primero, saber cuánto vale tu vivienda.',
  } satisfies TwoToneText,
  intro:
    'Valoramos, vendemos y te acompañamos con la hipoteca. Cada servicio dice qué incluye y qué cuesta; lo que aún no está confirmado aparece como pendiente.',
  includesLabel: 'Incluye',
  priceLabel: 'Precio',
  ask: 'Preguntar por WhatsApp',
  note: 'Servicios pendientes de confirmar.',
  cards: [
    {
      name: valuation.name,
      description: valuation.description,
      includes: [
        'Visita de un asesor a tu vivienda',
        'Precio de venta realista',
        'Basado en ventas recientes de tu zona',
      ],
      price: valuation.price ?? '',
      pricePending: false,
    },
    {
      name: sale.name,
      description: sale.description,
      includes: [
        'Fotografía',
        'Publicación',
        'Visitas filtradas',
        'Negociación hasta la firma en notaría',
      ],
      price: 'Honorarios pendientes de confirmar',
      pricePending: true,
    },
    {
      name: mortgage.name,
      description: mortgage.description,
      includes: [
        'Comparación de ofertas de varios bancos',
        'Acompañamiento en la tasación',
        'Acompañamiento en la firma',
      ],
      price: 'Honorarios pendientes de confirmar',
      pricePending: true,
    },
  ] satisfies ServiceCard[],
};

export const process = {
  title: {
    lead: 'Cómo vendemos tu vivienda.',
    rest: 'Seis pasos, de la primera visita a la notaría.',
  } satisfies TwoToneText,
  steps: [
    {
      title: 'Valoración',
      body: 'Un asesor visita tu vivienda y te da un precio de venta realista basado en ventas recientes de tu zona.',
    },
    {
      title: 'Fotografía',
      body: 'Fotografiamos la vivienda para que el anuncio la enseñe tal como es, con luz y orden.',
    },
    {
      title: 'Publicación',
      body: 'Publicamos el anuncio con el precio que hayas decidido y una descripción clara de la vivienda.',
    },
    {
      title: 'Visitas filtradas',
      body: 'Antes de enseñar la casa hablamos con cada interesado, para que las visitas sean de quien de verdad puede comprarla.',
    },
    {
      title: 'Negociación',
      body: 'Te trasladamos cada oferta y negociamos contigo. La decisión de aceptar es siempre tuya.',
    },
    {
      title: 'Firma en notaría',
      body: 'Te acompañamos hasta la firma de la compraventa ante notario.',
    },
  ] satisfies Step[],
  asideTitle: 'Empieza por el primer paso',
  asideBody:
    'La valoración es gratis. Con un precio realista en la mano decides tú si quieres vender y cómo.',
};

export const calculator = {
  title: {
    lead: 'Calcula una cuota orientativa.',
    rest: 'Cuatro datos, una cifra.',
  } satisfies TwoToneText,
  intro:
    'Cambia el precio, tu ahorro, el plazo o el tipo y la cuota se recalcula al momento. Junto a la calculadora, qué significa cada dato.',
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
  ] satisfies Step[],
  panelTitle: 'Tu cuota orientativa',
  fields: {
    price: 'Precio de la vivienda (€)',
    savings: 'Ahorro aportado (€)',
    years: 'Plazo (años)',
    rate: 'Tipo de interés anual (%)',
    rateHint: 'Tipo orientativo: cámbialo por el que te ofrezcan',
  },
  loanLabel: 'Importe del préstamo',
  monthlyLabel: 'Cuota mensual',
  shareLabel: 'Parte del precio que financia el banco',
  noScript:
    'Sin JavaScript el resultado no se recalcula: corresponde a los valores iniciales del formulario.',
  closingTitle: '¿Quieres comparar ofertas reales?',
  closingBody: mortgage.description,
};

export const faq = {
  title: {
    lead: 'Preguntas frecuentes.',
    rest: 'Lo que conviene saber antes de vender o pedir una hipoteca.',
  } satisfies TwoToneText,
  items: [
    {
      question: '¿Cuánto cuesta la valoración?',
      answer:
        'Nada: la valoración de tu vivienda es gratis. Un asesor la visita y te da un precio de venta realista basado en ventas recientes de tu zona.',
    },
    {
      question: '¿Qué honorarios tiene la venta o la asesoría hipotecaria?',
      answer:
        'Están pendientes de confirmar y todavía no aparecen en esta página. Pregúntanos por WhatsApp o por teléfono antes de empezar.',
    },
    {
      question: '¿Es lo mismo una valoración que una tasación?',
      answer:
        'No. La valoración es una estimación del precio de venta según el mercado de tu zona y sirve para decidir a qué precio publicar. La tasación la hace una sociedad de tasación homologada, normalmente a petición del banco, y sirve para calcular cuánto presta.',
    },
    {
      question: '¿Qué pasa si la tasación sale por debajo del precio?',
      answer:
        'Los bancos suelen calcular el préstamo sobre el valor más bajo de los dos, el precio o la tasación, así que tendrías que aportar más ahorro o volver a negociar el precio. Por eso ayuda partir de un precio realista.',
    },
    {
      question: '¿Cuánto me puede prestar el banco?',
      answer:
        'Depende de cada banco, de la vivienda y de tu situación: ingresos, deudas y ahorro. La calculadora te da una cuota orientativa para hacerte una idea; no es una oferta.',
    },
    {
      question: '¿Qué gastos hay además del precio de la vivienda?',
      answer:
        'Los impuestos de la compra (el de transmisiones en segunda mano, o IVA y actos jurídicos documentados en obra nueva), la notaría y el registro de la compraventa y, si hay hipoteca, la tasación. Los importes dependen de la vivienda y de la comunidad autónoma.',
    },
    {
      question: '¿En qué zonas trabajáis?',
      answer: `En ${site.serviceArea.slice(0, -1).join(', ')} y ${site.serviceArea.at(-1)}.`,
    },
  ] satisfies Question[],
};

export const contact = {
  title: {
    lead: '¿Cuánto vale tu vivienda?',
    rest: 'Escríbenos y quedamos para la valoración.',
  } satisfies TwoToneText,
  callPrefix: 'o llámanos al',
  emailPrefix: 'Correo:',
  note: 'Teléfono, WhatsApp y correo pendientes de confirmar.',
  hoursTitle: 'Horario',
  hoursLead: 'Jornada partida, con la pausa de mediodía.',
  addressTitle: 'Dirección',
  areaTitle: 'Dónde trabajamos',
  sampleNote: 'Horario y dirección pendientes de confirmar.',
};

export const footer = {
  line: 'Inmobiliaria y asesoría hipotecaria de barrio en Valencia.',
  contactTitle: 'Contacto',
  areaTitle: 'Zona de servicio',
  linksTitle: 'En esta página',
  creditsTitle: 'Fotografías',
  creditPrefix: 'Foto:',
  facadeCredit: 'Foto de la fachada: Zarateman, dominio público (CC0).',
};

export const notFound = {
  title: 'Página no encontrada · Casavela',
  description:
    'Esta página no existe. Vuelve al inicio o pide tu valoración gratuita por WhatsApp.',
  heading: {
    lead: 'Esta página no existe.',
    rest: 'Puede que el enlace esté mal escrito o ya no sirva.',
  } satisfies TwoToneText,
  body: 'Vuelve al inicio para ver nuestros servicios, o escríbenos y te ayudamos con lo que buscabas.',
  home: 'Volver al inicio',
};
