/**
 * Copy and data of the Fisioterapia Ribera landing (Spanish, single language).
 *
 * Every business fact here comes from sites/fisioterapia-ribera/brief.json, shown exactly as given. The brief is a
 * prospect brief for a fictional business: every fact is listed in its `assumed` array, so the page marks them as
 * example data in their own elements (never inside the element that holds the value). Structure: the PAS "Copy plan"
 * of PROPOSAL.md (Problem: hero, strip, qué tratamos; Agitate -> Solution: la sesión; Solution: primera visita,
 * precios, preguntas, contacto, cierre). No proof, no promise of results, no medical advice, no comparison.
 */

export interface Action {
  label: string;
  href: string;
}

export interface Fact {
  label: string;
  value: string;
  href?: string;
}

export interface Treatment {
  number: string;
  title: string;
  text: string;
}

export interface Stage {
  title: string;
  text: string;
}

export interface Step {
  title: string;
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
}

export interface Day {
  day: string;
  morning: string;
  afternoon: string;
}

export const business = {
  name: 'Fisioterapia Ribera',
  city: 'Zaragoza',
  description:
    'Clínica de fisioterapia de barrio con dos fisioterapeutas colegiados. Tratan dolor de espalda y cuello, lesiones deportivas y recuperación tras una operación, con sesiones individuales de 50 minutos y un plan de ejercicios para casa.',
} as const;

export const contact = {
  phone: '+34 976 000 000',
  phoneHref: 'tel:+34976000000',
  email: 'hola@example.com',
  emailHref: 'mailto:hola@example.com',
  address: 'Calle de Ejemplo 12, 50000 Zaragoza',
  hours: 'Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00',
  mapHref:
    'https://www.openstreetmap.org/search?query=Calle%20de%20Ejemplo%2012%2C%2050000%20Zaragoza',
  mapLabel: 'Cómo llegar (OpenStreetMap)',
} as const;

/** The one primary action of the page (goal.primary) and the quiet secondary one (goal.secondary). */
export const primaryAction: Action = {
  label: 'Pide tu primera valoración',
  href: 'https://reservas.example.com/fisioterapia-ribera',
};
/** Shorter label for the primary action in the header on phones; same destination. */
export const primaryActionShort = 'Reservar valoración';
export const secondaryAction: Action = {
  label: 'Llámanos',
  href: contact.phoneHref,
};

/** Labels for example data: always in their own element, next to the value they describe. */
export const exampleNotes = {
  facts: 'Datos de ejemplo: este negocio y sus datos son ficticios.',
  prices: 'Precios de ejemplo: el negocio y sus tarifas son ficticios.',
  photo: 'Foto ilustrativa',
} as const;

export const meta = {
  title: 'Fisioterapeuta en Zaragoza | Fisioterapia Ribera',
  description:
    'Fisioterapeuta en Zaragoza para dolor de espalda y cuello, lesiones deportivas y recuperación tras una operación. Sesiones individuales de 50 minutos.',
  skipLabel: 'Saltar al contenido',
} as const;

export const nav: Action[] = [
  { label: 'Qué tratamos', href: '#tratamos' },
  { label: 'La sesión', href: '#sesion' },
  { label: 'Precios', href: '#precios' },
  { label: 'Contacto', href: '#contacto' },
];

export const hero = {
  heading:
    'Fisioterapeuta en Zaragoza: 50 minutos con la misma persona, sin prisas',
  lead: 'Te duele la espalda o la rodilla. Empieza por saber qué te pasa.',
  text: 'Somos una clínica de barrio con dos fisioterapeutas colegiados. Si buscas fisioterapeuta en Zaragoza para el dolor de espalda o de cuello, una lesión deportiva o la recuperación tras una operación, cada sesión es individual y dura 50 minutos.',
  photoAlt:
    'Manos de un fisioterapeuta sobre el muslo de un paciente tumbado en una camilla, que sostiene la pierna en alto con una banda elástica.',
} as const;

export const strip = {
  label: 'Datos prácticos',
  facts: [
    { label: 'Dónde', value: contact.address, href: contact.mapHref },
    { label: 'Cuándo', value: contact.hours },
    { label: 'Teléfono', value: contact.phone, href: contact.phoneHref },
    {
      label: 'Reserva',
      value: 'Reserva en línea tu primera valoración',
      href: primaryAction.href,
    },
  ] satisfies Fact[],
} as const;

export const treatments = {
  heading: 'Qué tratamos',
  intro:
    'Tratamos dolor de espalda y cuello, lesiones deportivas y la recuperación tras una operación.',
  items: [
    {
      number: '1',
      title: 'Espalda y cuello',
      text: 'Dolor de espalda o de cuello que viene del trabajo: muchas horas sentado, de pie o cargando peso. Empezamos por entender cuándo aparece y qué lo empeora.',
    },
    {
      number: '2',
      title: 'Lesiones deportivas',
      text: 'Para corredores y aficionados al deporte con una lesión. Vemos cómo te mueves y preparamos los ejercicios que puedes seguir haciendo en casa.',
    },
    {
      number: '3',
      title: 'Después de una operación',
      text: 'Rehabilitación tras una operación de rodilla o de cadera, con sesiones individuales y un plan de ejercicios para casa entre una visita y la siguiente.',
    },
  ] satisfies Treatment[],
  photoAlt:
    'Rodilla de una persona con pantalón de chándal gris y una cinta sujeta bajo la rodilla, de la que tira una mano durante un ejercicio.',
} as const;

export const session = {
  heading: 'Una sesión, 50 minutos',
  agitate:
    '¿Has salido alguna vez de una consulta sin saber muy bien qué te habían hecho, o con la sensación de haber pasado el rato junto a un aparato?',
  solution:
    'Aquí cada sesión es individual y dura 50 minutos, con el mismo fisioterapeuta de principio a fin. Te explicamos qué hacemos y por qué, y te vas con ejercicios para casa.',
  rulerLabel: 'Regla de 0 a 50 minutos: la duración de una sesión individual.',
  rulerNote:
    'La regla mide la sesión entera. Cuánto dura cada parte depende de lo que necesites ese día.',
  minutes: ['0', '10', '20', '30', '40', '50 min'],
  stages: [
    {
      title: 'Escuchar',
      text: 'Nos cuentas cómo estás desde la última vez y qué te ha costado más.',
    },
    {
      title: 'Explorar',
      text: 'Vemos cómo te mueves hoy y dónde aparece el dolor.',
    },
    {
      title: 'Tratar',
      text: 'El tratamiento que hemos acordado contigo, con tu fisioterapeuta a tu lado todo el tiempo.',
    },
    {
      title: 'Ejercicios para casa',
      text: 'Repasamos tu plan de ejercicios para que sepas qué hacer hasta la próxima sesión.',
    },
  ] satisfies Stage[],
  closing: 'El mismo fisioterapeuta de principio a fin de la sesión.',
} as const;

export const firstVisit = {
  heading: 'La primera visita',
  intro:
    'Todo empieza con una primera valoración. Esto es lo que incluye, en este orden:',
  steps: [
    {
      title: 'Entrevista',
      text: 'Nos cuentas qué te pasa, desde cuándo y cómo afecta a tu día a día.',
    },
    {
      title: 'Exploración',
      text: 'Vemos cómo te mueves y dónde aparece el dolor.',
    },
    {
      title: 'Plan de tratamiento por escrito',
      text: 'Te lo llevas en papel: qué vamos a trabajar y cómo.',
    },
    {
      title: 'Primera sesión de tratamiento',
      text: 'La valoración la incluye, así que ese mismo día empezamos.',
    },
  ] satisfies Step[],
} as const;

export const prices = {
  heading: 'Precios',
  intro: 'Tres servicios, con su precio y lo que incluye cada uno.',
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
  highlightNote: 'Aquí empieza todo paciente nuevo.',
} as const;

export const questions = {
  heading: 'Preguntas',
  intro: 'Respuestas a las dudas de antes de la primera cita.',
  items: [
    {
      question: '¿Lo mío es para un fisio o para el médico?',
      answer:
        'Para eso está la primera valoración: empieza con una entrevista y una exploración, y sales con un plan de tratamiento por escrito. Esta página no puede decirte qué tienes; si tienes dudas, consulta también con tu médico.',
    },
    {
      question: '¿Cómo es una sesión?',
      answer:
        'Individual y de 50 minutos, con el mismo fisioterapeuta de principio a fin. Te explicamos lo que hacemos en cada momento y terminamos con tus ejercicios para casa.',
    },
    {
      question: 'No tengo tiempo para venir dos veces por semana.',
      answer:
        'Abrimos de lunes a viernes por la mañana y por la tarde, así que puedes venir antes o después del trabajo. Entre una visita y otra tienes tu plan de ejercicios para casa. Cuántas sesiones hacen falta lo vemos contigo en la primera valoración.',
    },
    {
      question: '¿Cómo pido cita?',
      answer:
        'Reserva en línea tu primera valoración con el botón de esta página, o llámanos y te buscamos un hueco.',
    },
  ] satisfies Question[],
} as const;

export const hoursCard = {
  heading: 'Horario',
  morningLabel: 'Mañana',
  afternoonLabel: 'Tarde',
  days: [
    { day: 'Lunes', morning: '8:00–14:00', afternoon: '16:00–21:00' },
    { day: 'Martes', morning: '8:00–14:00', afternoon: '16:00–21:00' },
    { day: 'Miércoles', morning: '8:00–14:00', afternoon: '16:00–21:00' },
    { day: 'Jueves', morning: '8:00–14:00', afternoon: '16:00–21:00' },
    { day: 'Viernes', morning: '8:00–14:00', afternoon: '16:00–21:00' },
  ] satisfies Day[],
} as const;

export const contactSection = {
  heading: 'Horario y contacto',
  intro: 'Todo lo que necesitas para venir o para hablar con nosotros.',
  facts: [
    { label: 'Dirección', value: contact.address },
    { label: 'Teléfono', value: contact.phone, href: contact.phoneHref },
    { label: 'Correo', value: contact.email, href: contact.emailHref },
  ] satisfies Fact[],
} as const;

export const closing = {
  heading: 'Empieza por una primera valoración',
  text: 'Reserva en línea o, si prefieres hablar con alguien, llámanos.',
} as const;

export const footer = {
  about:
    'Clínica de fisioterapia de barrio en Zaragoza: espalda y cuello, lesiones deportivas y recuperación tras una operación.',
  contactHeading: 'Contacto',
  hoursHeading: 'Horario',
  creditsHeading: 'Fotos',
  creditsIntro:
    'Fotos ilustrativas de Wikimedia Commons: no muestran esta clínica, su equipo ni sus pacientes.',
  creditsLinkLabel: 'Wikimedia Commons',
  publicDomainNote: 'La foto de la rodilla es de dominio público.',
  prospectLine:
    'Propuesta de diseño. Fisioterapia Ribera es un negocio ficticio: nombre, precios, horario y datos de contacto son de ejemplo.',
} as const;

export const notFound = {
  title: 'Página no encontrada | Fisioterapia Ribera',
  description:
    'Esta página no existe en la web de Fisioterapia Ribera. Vuelve al inicio o pide tu primera valoración.',
  heading: 'Esta página no existe',
  text: 'Puede que el enlace esté mal escrito o que la página se haya movido. Desde el inicio encontrarás qué tratamos, los precios y el horario.',
  homeLabel: 'Volver al inicio',
} as const;
