// Lead forms: the closed vocabularies of the brief (scripts/lib/brief-schema.mjs: FORM_PURPOSES, FORM_FIELDS,
// FORM_PROVIDERS) and the texts of the component in English and Spanish. Labels live here, never in the brief.
// The privacy policy has its own short field names (src/components/legal/texts.ts); tests keep both lists complete.

export const FORM_PURPOSES = [
  'valuation',
  'contact',
  'callback',
  'quote',
] as const;
export const FORM_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'postcode',
  'propertyType',
  'size',
  'message',
  'preferredTime',
] as const;
export const FORM_PROVIDERS = ['web3forms', 'whatsapp'] as const;

export type FormPurpose = (typeof FORM_PURPOSES)[number];
export type FormField = (typeof FORM_FIELDS)[number];
export type FormProvider = (typeof FORM_PROVIDERS)[number];
export type FormLanguage = 'en' | 'es';

/** One entry of the brief's `forms` array. */
export interface LeadFormConfig {
  id: string;
  purpose: FormPurpose;
  fields: FormField[];
  provider: FormProvider;
  /** Web3Forms access key (public by design). Without it a web3forms form falls back to WhatsApp. */
  accessKey?: string;
}

/** The only host a web3forms form posts to (https://docs.web3forms.com). */
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

/** The provider a form really uses: a web3forms form without an access key falls back to WhatsApp. */
export function effectiveProvider(form: LeadFormConfig): FormProvider {
  return form.provider === 'web3forms' && !form.accessKey?.trim()
    ? 'whatsapp'
    : form.provider;
}

export interface FieldSpec {
  control: 'input' | 'textarea' | 'select';
  type?: 'text' | 'email' | 'tel';
  autocomplete?: string;
  inputmode?: 'email' | 'tel' | 'decimal';
  required: boolean;
  /** Option keys of a select (their labels come from `options` in the dictionary). */
  options?: readonly string[];
}

/** HTML behavior of each field: control, type, autocomplete and inputmode for mobile keyboards. */
export const FIELD_SPECS: Record<FormField, FieldSpec> = {
  name: {
    control: 'input',
    type: 'text',
    autocomplete: 'name',
    required: true,
  },
  email: {
    control: 'input',
    type: 'email',
    autocomplete: 'email',
    inputmode: 'email',
    required: true,
  },
  phone: {
    control: 'input',
    type: 'tel',
    autocomplete: 'tel',
    inputmode: 'tel',
    required: true,
  },
  address: {
    control: 'input',
    type: 'text',
    autocomplete: 'street-address',
    required: true,
  },
  postcode: {
    control: 'input',
    type: 'text',
    autocomplete: 'postal-code',
    required: false,
  },
  propertyType: {
    control: 'select',
    required: false,
    options: ['apartment', 'house', 'land', 'commercial', 'other'],
  },
  size: {
    control: 'input',
    type: 'text',
    inputmode: 'decimal',
    required: false,
  },
  message: { control: 'textarea', required: false },
  preferredTime: {
    control: 'select',
    required: false,
    options: ['morning', 'afternoon', 'evening', 'any'],
  },
};

export interface FormTexts {
  labels: Record<FormField, string>;
  options: Record<string, string>;
  optional: string;
  choose: string;
  submit: Record<FormPurpose, string>;
  subject: Record<FormPurpose, (business: string) => string>;
  /** First line of the WhatsApp message. */
  greeting: Record<FormPurpose, string>;
  whatsappSubmit: string;
  /** The consent sentence: before + link text + after. */
  consent: { before: string; link: string; after: string };
  sending: string;
  success: string;
  error: string;
  rateLimit: string;
  whatsappOpened: string;
  whatsappFallbackNote: string;
  whatsappLink: string;
  thanks: { title: string; text: string; back: string };
}

const EN: FormTexts = {
  labels: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Property address',
    postcode: 'Postcode',
    propertyType: 'Property type',
    size: 'Size (m²)',
    message: 'Message',
    preferredTime: 'Best time to call',
  },
  options: {
    apartment: 'Apartment',
    house: 'House',
    land: 'Land',
    commercial: 'Commercial',
    other: 'Other',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    any: 'Any time',
  },
  optional: 'optional',
  choose: 'Choose…',
  submit: {
    valuation: 'Request my valuation',
    contact: 'Send message',
    callback: 'Request a call back',
    quote: 'Request a quote',
  },
  subject: {
    valuation: (b) => `${b}: new valuation request`,
    contact: (b) => `${b}: new message`,
    callback: (b) => `${b}: new call back request`,
    quote: (b) => `${b}: new quote request`,
  },
  greeting: {
    valuation: 'Hello, I would like to request a valuation.',
    contact: 'Hello, I would like to get in touch.',
    callback: 'Hello, please call me back.',
    quote: 'Hello, I would like to request a quote.',
  },
  whatsappSubmit: 'Continue on WhatsApp',
  consent: {
    before: 'I have read the ',
    link: 'privacy policy',
    after: ' and agree that my data is used to answer this request.',
  },
  sending: 'Sending…',
  success: 'Thank you. We received your request and will get back to you.',
  error:
    'We could not send your request. Your details are still here: please try again.',
  rateLimit:
    'Too many requests from your connection. Please wait a few minutes and try again.',
  whatsappOpened: 'WhatsApp is opening with your message ready to send.',
  whatsappFallbackNote:
    'Write to us on WhatsApp: the message opens ready to send.',
  whatsappLink: 'Write on WhatsApp',
  thanks: {
    title: 'Thank you',
    text: 'We received your request and will get back to you soon.',
    back: 'Back to the home page',
  },
};

const ES: FormTexts = {
  labels: {
    name: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    address: 'Dirección del inmueble',
    postcode: 'Código postal',
    propertyType: 'Tipo de inmueble',
    size: 'Superficie (m²)',
    message: 'Mensaje',
    preferredTime: 'Mejor hora para llamar',
  },
  options: {
    apartment: 'Piso',
    house: 'Casa',
    land: 'Terreno',
    commercial: 'Local comercial',
    other: 'Otro',
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
    any: 'Cualquier hora',
  },
  optional: 'opcional',
  choose: 'Elige…',
  submit: {
    valuation: 'Pedir mi valoración',
    contact: 'Enviar mensaje',
    callback: 'Pedir que me llamen',
    quote: 'Pedir presupuesto',
  },
  subject: {
    valuation: (b) => `${b}: nueva solicitud de valoración`,
    contact: (b) => `${b}: nuevo mensaje`,
    callback: (b) => `${b}: nueva solicitud de llamada`,
    quote: (b) => `${b}: nueva solicitud de presupuesto`,
  },
  greeting: {
    valuation: 'Hola, quisiera solicitar una valoración.',
    contact: 'Hola, quisiera ponerme en contacto.',
    callback: 'Hola, por favor llámame.',
    quote: 'Hola, quisiera pedir un presupuesto.',
  },
  whatsappSubmit: 'Continuar en WhatsApp',
  consent: {
    before: 'He leído la ',
    link: 'política de privacidad',
    after: ' y acepto que se usen mis datos para responder a esta solicitud.',
  },
  sending: 'Enviando…',
  success: 'Gracias. Hemos recibido tu solicitud y te responderemos.',
  error:
    'No hemos podido enviar tu solicitud. Tus datos siguen aquí: inténtalo de nuevo.',
  rateLimit:
    'Demasiadas solicitudes desde tu conexión. Espera unos minutos e inténtalo de nuevo.',
  whatsappOpened: 'Se abre WhatsApp con tu mensaje listo para enviar.',
  whatsappFallbackNote:
    'Escríbenos por WhatsApp: el mensaje se abre listo para enviar.',
  whatsappLink: 'Escribir por WhatsApp',
  thanks: {
    title: 'Gracias',
    text: 'Hemos recibido tu solicitud y te responderemos pronto.',
    back: 'Volver al inicio',
  },
};

export const FORM_TEXTS: Record<FormLanguage, FormTexts> = { en: EN, es: ES };

/** The texts for a locale tag (`es`, `pt-br`); a language without texts falls back to English. */
export const formTexts = (locale?: string): FormTexts =>
  FORM_TEXTS[(locale ?? 'en').split('-')[0] as FormLanguage] ?? EN;
