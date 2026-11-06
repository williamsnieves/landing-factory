// Page copy and data of the Fisioterapia Ribera landing (single locale, Spanish).
// Every business fact here comes from sites/fisioterapia-ribera/brief.json. This is a prospect landing whose facts are
// all listed in the brief's `assumed`, so contact data, hours and prices carry a quiet "de ejemplo" note on the page,
// always in a separate element from the value itself. No proof, ratings, figures or outcome promises (regulated niche).

export interface Action {
  label: string;
  href: string;
}

export interface Paragraph {
  lead: string;
  text: string;
}

export interface Step {
  name: string;
  text: string;
}

export interface Offer {
  name: string;
  price: string;
  description: string;
  highlighted: boolean;
}

export interface Question {
  question: string;
  answer: string;
  /** Optional link under the answer. */
  link?: Action;
}

/** One opening interval in 24 h minutes from midnight. */
export interface Interval {
  from: number;
  to: number;
}

export interface HoursRow {
  /** Label of the row. */
  label: string;
  /** JavaScript day numbers (0 Sunday ... 6 Saturday) the row covers. */
  days: number[];
  /** Text of the opening times. */
  times: string;
  intervals: Interval[];
}

export const business = {
  name: 'Fisioterapia Ribera',
  city: 'Zaragoza',
};

export const primaryAction: Action = {
  label: 'Pide tu primera valoración',
  href: 'https://reservas.example.com/fisioterapia-ribera',
};

export const callAction: Action = {
  label: 'Llámanos',
  href: 'tel:+34976000000',
};

export const contact = {
  phone: '+34 976 000 000',
  phoneHref: 'tel:+34976000000',
  email: 'hola@example.com',
  emailHref: 'mailto:hola@example.com',
  address: 'Calle de Ejemplo 12, 50000 Zaragoza',
  hours: 'Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00',
};

/** Quiet labels for the placeholders (never inside the element that holds the value). */
export const sampleNotes = {
  contact: 'Dirección, teléfono y correo son datos de ejemplo.',
  hours: 'Horario de ejemplo.',
  prices: 'Precios de ejemplo.',
  phone: 'Teléfono de ejemplo.',
  footer:
    'Esta página es una propuesta: la dirección, el teléfono, el correo, el horario y los precios son datos de ejemplo.',
};

export const seo = {
  title: 'Fisioterapeuta en Zaragoza | Fisioterapia Ribera',
  description:
    'Fisioterapeuta en Zaragoza para dolor de espalda y cuello, lesiones deportivas y recuperación tras una operación. Sesiones individuales de 50 minutos.',
};

export const skipLabel = 'Saltar al contenido';

export const header = {
  homeLabel: 'Fisioterapia Ribera, inicio',
  callLabel: 'Llámanos',
};

export const hero = {
  /** The h1 in its lines; the thread joins "principio" (line 3) to "fin" (line 4). */
  lines: ['Tu fisioterapeuta', 'en Zaragoza,', 'de principio', 'a fin.'],
  text: 'Atendemos dolor de espalda y cuello, lesiones deportivas y la recuperación después de una operación. Sesiones individuales de 50 minutos con la misma persona, y un plan de ejercicios para casa.',
};

export const practical = {
  heading: 'Dónde y cuándo.',
  addressLabel: 'Dirección',
  phoneLabel: 'Teléfono',
  emailLabel: 'Correo',
  bookText: 'Reserva en línea o llámanos: te decimos qué hueco te viene mejor.',
};

export const hoursCard = {
  title: 'Horario',
  tableLabel: 'Horario de la clínica, de lunes a domingo',
  todayLabel: 'Hoy',
  openNow: 'Abierto ahora, hasta las',
  closedNow: 'Cerrado ahora.',
  opensAt: 'Abrimos a las',
  opensDay: 'Abrimos el',
  opensTomorrow: 'Abrimos mañana a las',
  atTime: 'a las',
  /** Day names by JavaScript day number (0 Sunday). */
  dayNames: [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ],
  rows: [
    {
      label: 'Lunes',
      days: [1],
      times: '8:00–14:00 y 16:00–21:00',
      intervals: [
        { from: 480, to: 840 },
        { from: 960, to: 1260 },
      ],
    },
    {
      label: 'Martes',
      days: [2],
      times: '8:00–14:00 y 16:00–21:00',
      intervals: [
        { from: 480, to: 840 },
        { from: 960, to: 1260 },
      ],
    },
    {
      label: 'Miércoles',
      days: [3],
      times: '8:00–14:00 y 16:00–21:00',
      intervals: [
        { from: 480, to: 840 },
        { from: 960, to: 1260 },
      ],
    },
    {
      label: 'Jueves',
      days: [4],
      times: '8:00–14:00 y 16:00–21:00',
      intervals: [
        { from: 480, to: 840 },
        { from: 960, to: 1260 },
      ],
    },
    {
      label: 'Viernes',
      days: [5],
      times: '8:00–14:00 y 16:00–21:00',
      intervals: [
        { from: 480, to: 840 },
        { from: 960, to: 1260 },
      ],
    },
    {
      label: 'Sábado y domingo',
      days: [6, 0],
      times: 'Cerrado',
      intervals: [],
    },
  ] satisfies HoursRow[],
};

export const problem = {
  statement: 'Te duele, y no sabes a quién acudir.',
  text: 'La espalda que se queja al final de la jornada, el cuello que no gira, la rodilla que no termina de responder. ¿Es para un fisio o para el médico? Lo primero es saber qué te pasa y qué puedes hacer tú. Por ahí empezamos.',
};

export const whoWeSee = {
  heading: 'A quién atendemos.',
  items: [
    {
      lead: 'Dolor de espalda y cuello por el trabajo.',
      text: 'Horas sentado, de pie o cargando peso, y una molestia que vuelve cada semana. Fisioterapia para el dolor de espalda, en Zaragoza y cerca de casa.',
    },
    {
      lead: 'Una lesión haciendo deporte.',
      text: 'Corredores y aficionados al deporte que quieren entender su lesión y saber qué pueden hacer. Fisioterapia deportiva con un plan claro.',
    },
    {
      lead: 'Después de una operación.',
      text: 'Rehabilitación tras una operación de rodilla o cadera, con la misma persona en cada sesión mientras dura el tratamiento.',
    },
  ] satisfies Paragraph[],
  photoAlt:
    'Manos de un fisioterapeuta trabajando sobre el omóplato de una persona tumbada',
  caption: 'Foto ilustrativa',
};

export const firstVisit = {
  statement: 'Primero, entender qué te pasa.',
  intro: 'Así es la primera valoración, en una sola visita:',
  steps: [
    {
      name: 'Entrevista',
      text: 'Nos cuentas qué te pasa, desde cuándo y cómo es tu día a día.',
    },
    {
      name: 'Exploración',
      text: 'Miramos cómo te mueves y qué te molesta al hacerlo.',
    },
    {
      name: 'Plan de tratamiento por escrito',
      text: 'Te lo damos en papel, para que sepas qué vamos a hacer y por qué.',
    },
    {
      name: 'Primera sesión',
      text: 'La valoración incluye la primera sesión de tratamiento.',
    },
  ] satisfies Step[],
  ending: 'Y te llevas un plan de ejercicios para casa.',
};

export const samePerson = {
  statement: 'Dos fisioterapeutas colegiados. Siempre el mismo contigo.',
  text: 'Cada sesión es individual y dura 50 minutos. Quien te hace la valoración te acompaña de principio a fin, así no tienes que volver a contar tu historia cada vez.',
};

export const prices = {
  heading: 'Lo que cuesta.',
  offers: [
    {
      name: 'Primera valoración',
      price: '45 €',
      description:
        'Entrevista, exploración y plan de tratamiento por escrito. Incluye la primera sesión de tratamiento.',
      highlighted: true,
    },
    {
      name: 'Sesión de fisioterapia',
      price: '40 €',
      description:
        'Sesión individual de 50 minutos con el mismo fisioterapeuta de principio a fin.',
      highlighted: false,
    },
    {
      name: 'Bono de 5 sesiones',
      price: '180 €',
      description:
        'Cinco sesiones individuales para un mismo tratamiento, válidas durante tres meses.',
      highlighted: false,
    },
  ] satisfies Offer[],
  firstStepNote: 'El primer paso si vienes por primera vez.',
};

export const questions = {
  heading: 'Antes de venir.',
  items: [
    {
      question: '¿Lo mío es para un fisioterapeuta o para el médico?',
      answer:
        'En la primera valoración te escuchamos y te exploramos para ver si la fisioterapia es lo que necesitas. Si lo que nos cuentas pide antes la opinión de un médico, te lo decimos con claridad. Si tienes dudas antes de reservar, llámanos y lo hablamos.',
    },
    {
      question: '¿Las sesiones son solo con aparatos?',
      answer:
        'Cada sesión es individual, dura 50 minutos y la hace contigo el mismo fisioterapeuta de principio a fin. Te explicamos qué hacemos en cada momento y por qué, y te llevas un plan de ejercicios para casa.',
    },
    {
      question: 'No tengo tiempo para ir dos veces por semana.',
      answer:
        'Abrimos de lunes a viernes por la mañana y por la tarde, para que puedas venir antes o después del trabajo. Cuántas sesiones y cada cuánto se decide contigo en la primera valoración, según tu plan y tu tiempo; el plan de ejercicios es para los días entre sesiones. El bono de 5 sesiones vale durante tres meses.',
      link: { label: 'Ver el horario', href: '#cuando' },
    },
  ] satisfies Question[],
  photoAlt: 'Sala de tratamiento vacía y luminosa, con una camilla blanca',
  caption: 'Foto ilustrativa',
};

export const closing = {
  statement: 'Empieza por una valoración.',
  text: 'Entrevista, exploración, plan por escrito y primera sesión, en una sola visita.',
  callPrefix: 'O llámanos al',
};

export const footer = {
  tagline: 'Clínica de fisioterapia de barrio en Zaragoza.',
  creditsIntro: 'Fotos ilustrativas de',
};

export const notFound = {
  title: 'Página no encontrada | Fisioterapia Ribera',
  description:
    'Esta página de Fisioterapia Ribera no existe. Vuelve al inicio o pide tu primera valoración de fisioterapia en Zaragoza.',
  heading: 'Aquí se pierde el hilo.',
  text: 'El enlace puede estar desactualizado o mal escrito. Vuelve al inicio y lo retomamos desde el principio.',
  homeLabel: 'Volver al inicio',
};
