/**
 * Page copy of the Turnio landing (single language: es). Sections read their text from here; facts (plans,
 * prices, links, contact) come from src/data/plans.ts and are copied from brief.json exactly.
 */
import { plans, primaryAction, secondaryAction } from '../data/plans';

export interface TwoTone {
  /** Lead clause, full contrast. */
  lead: string;
  /** Continuation, muted tone. */
  rest: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface Fact {
  label: string;
  text: string;
}

export interface Step {
  label: string;
  title: string;
  text: string;
}

export interface Question {
  question: string;
  answer: string;
}

export interface FeatureCopy {
  id: string;
  /** Time of day the module is filed under (a scene label, never a metric). */
  time: string;
  heading: TwoTone;
  body: string[];
  link?: NavLink;
}

export const brand = {
  name: 'Turnio',
  email: 'hola@example.com',
} as const;

export const meta = {
  title: 'Turnio: app de reservas para peluquerías y estética',
  description:
    'Turnio es la app de reservas para peluquerías y centros de estética: citas desde un enlace o Instagram, recordatorio por WhatsApp y un plan gratis.',
  skipLabel: 'Saltar al contenido',
};

export const nav: NavLink[] = [
  { label: 'Funciones', href: '/#reservas' },
  { label: 'Cómo empezar', href: '/#empezar' },
  { label: 'Precios', href: '/#precios' },
  { label: 'Preguntas', href: '/#preguntas' },
];

export const header = {
  homeLabel: 'Turnio, ir al inicio',
  menuLabel: 'Menú',
  navLabel: 'Secciones',
  cta: primaryAction,
};

export const hero = {
  heading: {
    lead: 'Tus clientes reservan solos.',
    rest: 'La app de reservas para peluquerías.',
  } satisfies TwoTone,
  intro:
    'Tú sigues con las tijeras. Con Turnio, la app de reservas para peluquerías y centros de estética, las citas entran desde un enlace o Instagram a cualquier hora.',
  primary: primaryAction,
  secondary: secondaryAction,
  note: 'La prueba del Plan Pro dura 14 días y no pide tarjeta.',
  mockLabel:
    'Vista de un día en la agenda de Turnio: columnas para dos sillones y una cabina, con citas de corte, color, mechas, manicura y otros servicios repartidas por horas, y una reserva nueva llegada desde Instagram.',
};

export const facts: Fact[] = [
  { label: 'Reservas', text: 'Desde un enlace o Instagram' },
  { label: 'Recordatorios', text: 'Por WhatsApp en el Plan Pro' },
  { label: 'Equipo', text: 'De 1 a 8 profesionales' },
  { label: 'Para empezar', text: 'Plan Gratis a 0 €' },
];

export const factsLabel = 'Turnio en cuatro datos';

export const statementLabel = 'La idea';

export const statement: TwoTone = {
  lead: 'Contestar WhatsApps para dar citas, con las tijeras en la mano.',
  rest: 'Turnio se encarga de las reservas y de los recordatorios.',
};

export const booking: FeatureCopy & {
  mockLabel: string;
  instagramLabel: string;
} = {
  id: 'reservas',
  time: '23:40',
  heading: {
    lead: 'Reservan a cualquier hora.',
    rest: 'Sin escribirte ni una vez.',
  },
  body: [
    'Compartes tu enlace de reservas y cada cliente elige servicio, día y hora entre los huecos libres de tu agenda. Tú no tienes que contestar nada.',
    'Con el Plan Pro, también pueden reservar desde el botón de tu perfil de Instagram.',
  ],
  link: { label: 'Ver qué incluye cada plan', href: '#precios' },
  mockLabel:
    'Página de reservas de un salón en el móvil: se elige el servicio Corte, el jueves y la hora 10:30, y se pulsa Reservar.',
  instagramLabel:
    'Perfil de Instagram de un salón con un botón Reservar junto al botón Mensaje.',
};

export const reminders: FeatureCopy & {
  mockLabel: string;
  depositLabel: string;
} = {
  id: 'recordatorios',
  time: '19:00',
  heading: {
    lead: 'Cada cita, su recordatorio.',
    rest: 'Por WhatsApp, sin escribirlo tú.',
  },
  body: [
    'Con el Plan Pro, Turnio manda los recordatorios de citas por WhatsApp para que nadie se olvide de venir. En el Plan Gratis, el recordatorio llega por email.',
    'Y si quieres asegurar el hueco, el Plan Pro permite cobrar una señal en el momento de reservar.',
  ],
  mockLabel:
    'Conversación de WhatsApp: el salón recuerda a su cliente la cita de corte de mañana a las 10:30 y le deja un enlace por si necesita cambiarla.',
  depositLabel: 'Señal pagada al reservar',
};

export const agenda: FeatureCopy & {
  mockLabel: string;
  reportLabel: string;
} = {
  id: 'agenda',
  time: 'lunes 08:55',
  heading: {
    lead: 'La semana entera, de un vistazo.',
    rest: 'Antes de subir la persiana.',
  },
  body: [
    'Turnio es una agenda online para tu peluquería o tu centro de estética: abres la semana y ves qué días están llenos y dónde quedan huecos.',
    'Con el Plan Equipo, la agenda se organiza por cabina o sillón para hasta 8 profesionales, con informes de ocupación para repartir mejor el trabajo.',
  ],
  mockLabel:
    'Vista semanal de la agenda de lunes a sábado, filtrada por sillón o cabina, junto a un informe de ocupación por día dibujado con barras.',
  reportLabel: 'Ocupación por día',
};

export const steps = {
  id: 'empezar',
  heading: {
    lead: 'Empezar es sencillo.',
    rest: 'Tres pasos, en este orden.',
  } satisfies TwoTone,
  items: [
    {
      label: 'Primero',
      title: 'Crea tu cuenta gratis',
      text: 'Abres tu cuenta en el Plan Gratis, a 0 €, y preparas tu enlace de reservas.',
    },
    {
      label: 'Después',
      title: 'Comparte tu enlace',
      text: 'Se lo mandas a tus clientes y lo dejas donde ya te buscan. Con el Plan Pro, también en Instagram.',
    },
    {
      label: 'Y a partir de ahí',
      title: 'Ellos reservan, Turnio avisa',
      text: 'Las citas entran en tu agenda y cada una recibe su recordatorio: por email en el Plan Gratis, por WhatsApp en el Pro.',
    },
  ] satisfies Step[],
};

export const pricing = {
  id: 'precios',
  heading: {
    lead: 'Tres planes.',
    rest: 'Elige el que encaje con tu salón.',
  } satisfies TwoTone,
  priceNote: 'Precios en euros.',
  tableLabel: 'Comparativa de lo que incluye cada plan',
  featureHeader: 'Qué incluye',
  included: 'Incluido',
  notIncluded: 'No incluido',
};

export const faq = {
  id: 'preguntas',
  heading: {
    lead: 'Dudas razonables.',
    rest: 'Respuestas cortas.',
  } satisfies TwoTone,
  items: [
    {
      question: 'Ya me apaño con WhatsApp y una libreta. ¿Para qué cambiar?',
      answer: `Si te funciona, perfecto. Turnio es para cuando contestar mensajes te quita tiempo con el cliente que tienes delante: tus clientes reservan desde un enlace a cualquier hora, la agenda queda en un solo sitio y cada cita lleva su recordatorio. Puedes probar este software de citas para peluquería en el ${plans[0].name}, a ${plans[0].price}.`,
    },
    {
      question: 'Mis clientes mayores no sabrán reservar por internet.',
      answer:
        'Reservar es abrir un enlace en el móvil y elegir servicio, día y hora. Con el Plan Pro, el recordatorio les llega por WhatsApp, la aplicación que ya usan para hablar contigo.',
    },
    {
      question: 'Cambiar de sistema me quitará un tiempo que no tengo.',
      answer: `Se empieza en tres pasos: abres la cuenta gratis, compartes tu enlace y las reservas van entrando. Si quieres los recordatorios por WhatsApp, el ${plans[1].name} tiene una prueba de 14 días sin tarjeta y después cuesta ${plans[1].price}.`,
    },
    {
      question: '¿Cuántas personas pueden usarlo en mi salón?',
      answer: `El ${plans[0].name} es para un profesional. El ${plans[2].name} cubre hasta 8 profesionales, con agenda por cabina o sillón e informes de ocupación, por ${plans[2].price}.`,
    },
  ] satisfies Question[],
};

export const closing = {
  id: 'empieza',
  line: {
    lead: 'Deja que las citas entren solas.',
    rest: 'Tú, a lo tuyo.',
  } satisfies TwoTone,
  primary: primaryAction,
  secondary: secondaryAction,
};

export const footer = {
  label: 'Pie de página',
  columns: {
    product: 'Producto',
    plans: 'Planes',
    contact: 'Contacto',
  },
  tagline: 'Reservas online para peluquerías, barberías y centros de estética.',
  demoNote:
    'Turnio es un producto de demostración: planes, precios, enlaces y contacto son de ejemplo.',
};

export const notFound = {
  title: 'Página no encontrada | Turnio',
  description:
    'Esta página de Turnio no existe. Vuelve al inicio o empieza gratis con la app de reservas para peluquerías.',
  heading: {
    lead: 'Esta página no tiene cita.',
    rest: 'Pero la agenda sigue abierta.',
  } satisfies TwoTone,
  body: 'El enlace puede estar mal escrito o haber cambiado. Desde aquí puedes volver al inicio o abrir tu cuenta gratis.',
  home: { label: 'Volver al inicio', href: '/' } satisfies NavLink,
  primary: primaryAction,
  time: '404',
};
