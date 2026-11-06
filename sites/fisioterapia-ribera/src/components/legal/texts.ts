// These templates support compliance and are not legal advice. They are short and factual, built only from
// the data in src/data/legal.json (written by `node scripts/legal.mjs --site <slug> --write` from the brief),
// and a person must review them before the page goes live in production.
// A value the brief does not have is never invented: the components show a visible "pending legal review" marker.

export type LegalLanguage = 'en' | 'es';

/** The shape of src/data/legal.json. */
export interface LegalData {
  version: number;
  language: string;
  business: { name: string; domain: string };
  markets: string[];
  pages: string[];
  unknownMarkets: string[];
  holder: {
    name: string;
    taxId: string;
    address: string;
    email: string;
    register: string;
  };
  privacyContact: string;
  processing: {
    analytics: string;
    /** `true` in older files; `{ provider, providers, purposes, fields }` once the brief has forms (lead forms). */
    forms: boolean | FormsProcessing;
    embeds: string[];
  };
  hosting: { target: string; name: string };
  thirdPartyHosts: string[];
  pending: string[];
  /** Multi-locale sites only: the default locale and where each locale's legal pages live. */
  defaultLocale?: string;
  locales?: {
    locale: string;
    language: string;
    paths: Partial<Record<'privacy' | 'notice', string>>;
  }[];
}

/** What the brief's `forms` section records for the privacy policy (written by scripts/legal.mjs). */
export interface FormsProcessing {
  /** The provider that really carries the data: `web3forms` when any form posts to it, else `whatsapp`. */
  provider: 'web3forms' | 'whatsapp';
  /** Every provider the forms use, sorted. */
  providers: ('web3forms' | 'whatsapp')[];
  purposes: string[];
  fields: string[];
}

export interface Texts {
  pending: string;
  notice: {
    title: string;
    holderHeading: string;
    holderIntro: string;
    labels: Record<'name' | 'taxId' | 'address' | 'email' | 'register', string>;
    purposeHeading: string;
    purpose: (name: string) => string;
    ipHeading: string;
    ip: string;
    linksHeading: string;
    links: string;
    privacyLink: string;
  };
  privacy: {
    title: string;
    controllerHeading: string;
    controllerIntro: string;
    labels: Record<'name' | 'taxId' | 'address' | 'email', string>;
    dataHeading: string;
    logs: (host: string) => string;
    hostFallback: string;
    analyticsLabel: string;
    analytics: Record<'none' | 'cookieless' | 'cookies', string>;
    forms: string;
    /** Paragraphs about the providers of the lead forms (empty for `forms: true`). */
    formsProviders: (forms: FormsProcessing) => string[];
    embeds: (list: string) => string;
    hostsHeading: string;
    hosts: (list: string) => string;
    rightsHeading: string;
    rights: string;
    complaint: (markets: string[]) => string;
    contactHeading: string;
    contact: string;
    noticeLink: string;
  };
}

/** Words the form paragraphs use (the form component has the on-screen labels; these are the policy's own wording). */
interface FormsWords {
  fields: Record<string, string>;
  purposes: Record<string, string>;
  and: string;
  web3forms: (fields: string, purposes: string) => string;
  whatsapp: (fields: string) => string;
}

const list = (items: string[], and: string): string =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;

const EN_FORMS: FormsWords = {
  fields: {
    name: 'name',
    email: 'email address',
    phone: 'phone number',
    address: 'property address',
    postcode: 'postcode',
    propertyType: 'property type',
    size: 'size',
    message: 'message',
    preferredTime: 'preferred time to call',
  },
  purposes: {
    valuation: 'prepare and answer your valuation request',
    contact: 'answer your message',
    callback: 'call you back',
    quote: 'prepare your quote',
  },
  and: 'and',
  web3forms: (fields, purposes) =>
    `The forms on this website are sent through Web3Forms, a service of Web3Creative (Kerala, India), which acts as a processor on behalf of the holder. When you submit a form, your browser sends what you entered (${fields}) and your IP address to Web3Forms servers in the United States, which is an international transfer of personal data. Web3Forms forwards the message by email to the holder and does not store submissions; its server logs with personal data are deleted about every two months. We use these data to ${purposes}, and we keep your request as long as needed to answer it.`,
  whatsapp: (fields) =>
    `If you choose to write to us on WhatsApp, the form prepares a message with what you entered (${fields}) and opens WhatsApp. Nothing is sent until you send the message there, and WhatsApp (Meta) processes it under its own terms and privacy policy.`,
};

const ES_FORMS: FormsWords = {
  fields: {
    name: 'nombre',
    email: 'correo electrónico',
    phone: 'teléfono',
    address: 'dirección del inmueble',
    postcode: 'código postal',
    propertyType: 'tipo de inmueble',
    size: 'superficie',
    message: 'mensaje',
    preferredTime: 'hora preferida para llamar',
  },
  purposes: {
    valuation: 'preparar y responder tu solicitud de valoración',
    contact: 'responder a tu mensaje',
    callback: 'devolverte la llamada',
    quote: 'preparar tu presupuesto',
  },
  and: 'y',
  web3forms: (fields, purposes) =>
    `Los formularios de este sitio web se envían a través de Web3Forms, un servicio de Web3Creative (Kerala, India), que actúa como encargado del tratamiento por cuenta del titular. Al enviar un formulario, tu navegador envía lo que has escrito (${fields}) y tu dirección IP a los servidores de Web3Forms en Estados Unidos, lo que supone una transferencia internacional de datos personales. Web3Forms reenvía el mensaje por correo electrónico al titular y no almacena los envíos; sus registros de servidor con datos personales se eliminan aproximadamente cada dos meses. Usamos estos datos para ${purposes}, y conservamos tu solicitud el tiempo necesario para responderla.`,
  whatsapp: (fields) =>
    `Si eliges escribirnos por WhatsApp, el formulario prepara un mensaje con lo que has escrito (${fields}) y abre WhatsApp. No se envía nada hasta que envías el mensaje allí, y WhatsApp (Meta) lo trata según sus propios términos y política de privacidad.`,
};

/** Paragraphs for each provider the lead forms use; a field or purpose outside the closed lists is left out. */
function formsParagraphs(words: FormsWords, forms: FormsProcessing): string[] {
  const fields = list(
    forms.fields.flatMap((f) => (words.fields[f] ? [words.fields[f]] : [])),
    words.and,
  );
  const purposes = list(
    forms.purposes.flatMap((p) =>
      words.purposes[p] ? [words.purposes[p]] : [],
    ),
    words.and,
  );
  return [
    ...(forms.providers.includes('web3forms')
      ? [words.web3forms(fields, purposes)]
      : []),
    ...(forms.providers.includes('whatsapp') ? [words.whatsapp(fields)] : []),
  ];
}

const EN: Texts = {
  pending: 'Pending legal review',
  notice: {
    title: 'Legal notice',
    holderHeading: 'Who runs this website',
    holderIntro: 'This website is run by:',
    labels: {
      name: 'Name',
      taxId: 'Tax ID',
      address: 'Address',
      email: 'Email',
      register: 'Register entry',
    },
    purposeHeading: 'Purpose',
    purpose: (name) =>
      `This website presents the offer of ${name} and the ways to contact it.`,
    ipHeading: 'Intellectual property',
    ip: 'Texts, images and design belong to the holder or are used under the licenses listed in the credits of this website.',
    linksHeading: 'Links to other websites',
    links:
      'Links to other websites are provided for convenience. The holder does not control their content.',
    privacyLink: 'How we handle personal data: privacy policy',
  },
  privacy: {
    title: 'Privacy policy',
    controllerHeading: 'Who is responsible',
    controllerIntro:
      'The controller of the personal data processed on this website is:',
    labels: {
      name: 'Name',
      taxId: 'Tax ID',
      address: 'Address',
      email: 'Email',
    },
    dataHeading: 'What data we process',
    logs: (host) =>
      `When you visit this website, ${host} processes technical data such as your IP address, the pages requested and the date and time, to deliver the pages and keep them secure. This is done in the legitimate interest of operating the website.`,
    hostFallback: 'the hosting provider',
    analyticsLabel: 'Analytics',
    analytics: {
      none: 'This website does not use analytics and does not set cookies.',
      cookieless:
        'This website measures visits with a service that does not store information on your device and does not set cookies.',
      cookies:
        'This website uses analytics cookies and asks for your consent before setting them.',
    },
    forms:
      'If you contact us through a form or by email, we use the data you send to answer your request.',
    formsProviders: (forms) => formsParagraphs(EN_FORMS, forms),
    embeds: (list) =>
      `This website embeds content from third parties: ${list}. These services may receive your IP address and may set cookies.`,
    hostsHeading: 'Third-party servers',
    hosts: (list) =>
      `Loading this website requests resources from these third-party servers, which receive your IP address: ${list}.`,
    rightsHeading: 'Your rights',
    rights:
      'You can ask for access to your personal data, its correction or deletion, to restrict or object to its processing, and to receive it in a portable format.',
    complaint: (markets) =>
      markets.includes('ES')
        ? 'You can also lodge a complaint with the Spanish Data Protection Agency (AEPD, aepd.es).'
        : 'You can also lodge a complaint with your national data protection authority.',
    contactHeading: 'Contact for privacy requests',
    contact: 'Write to:',
    noticeLink: 'Who runs this website: legal notice',
  },
};

const ES: Texts = {
  pending: 'Pendiente de revisión legal',
  notice: {
    title: 'Aviso legal',
    holderHeading: 'Titular de este sitio web',
    holderIntro: 'Este sitio web es titularidad de:',
    labels: {
      name: 'Nombre o razón social',
      taxId: 'NIF/CIF',
      address: 'Domicilio',
      email: 'Correo electrónico',
      register: 'Datos registrales',
    },
    purposeHeading: 'Objeto',
    purpose: (name) =>
      `Este sitio web presenta la oferta de ${name} y las vías para contactar con su titular.`,
    ipHeading: 'Propiedad intelectual',
    ip: 'Los textos, imágenes y el diseño pertenecen al titular o se utilizan bajo las licencias indicadas en los créditos de este sitio web.',
    linksHeading: 'Enlaces a otros sitios web',
    links:
      'Los enlaces a otros sitios web se ofrecen por comodidad. El titular no controla su contenido.',
    privacyLink: 'Cómo tratamos los datos personales: política de privacidad',
  },
  privacy: {
    title: 'Política de privacidad',
    controllerHeading: 'Responsable del tratamiento',
    controllerIntro:
      'El responsable de los datos personales tratados en este sitio web es:',
    labels: {
      name: 'Nombre o razón social',
      taxId: 'NIF/CIF',
      address: 'Domicilio',
      email: 'Correo electrónico',
    },
    dataHeading: 'Qué datos tratamos',
    logs: (host) =>
      `Cuando visitas este sitio web, ${host} trata datos técnicos como tu dirección IP, las páginas solicitadas y la fecha y hora, para entregar las páginas y mantenerlas seguras. Se hace por el interés legítimo de operar el sitio web.`,
    hostFallback: 'el proveedor de alojamiento',
    analyticsLabel: 'Analítica',
    analytics: {
      none: 'Este sitio web no usa analítica ni instala cookies.',
      cookieless:
        'Este sitio web mide las visitas con un servicio que no guarda información en tu dispositivo ni instala cookies.',
      cookies:
        'Este sitio web usa cookies de analítica y pide tu consentimiento antes de instalarlas.',
    },
    forms:
      'Si nos contactas mediante un formulario o por correo electrónico, usamos los datos que envías para responder a tu solicitud.',
    formsProviders: (forms) => formsParagraphs(ES_FORMS, forms),
    embeds: (list) =>
      `Este sitio web incorpora contenido de terceros: ${list}. Estos servicios pueden recibir tu dirección IP y pueden instalar cookies.`,
    hostsHeading: 'Servidores de terceros',
    hosts: (list) =>
      `La carga de este sitio web solicita recursos a estos servidores de terceros, que reciben tu dirección IP: ${list}.`,
    rightsHeading: 'Tus derechos',
    rights:
      'Puedes solicitar el acceso a tus datos personales, su rectificación o supresión, la limitación u oposición a su tratamiento y su portabilidad.',
    complaint: (markets) =>
      markets.includes('ES')
        ? 'También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD, aepd.es).'
        : 'También puedes presentar una reclamación ante tu autoridad nacional de protección de datos.',
    contactHeading: 'Contacto para solicitudes de privacidad',
    contact: 'Escribe a:',
    noticeLink: 'Titular de este sitio web: aviso legal',
  },
};

export const TEXTS: Record<LegalLanguage, Texts> = { en: EN, es: ES };

/** The texts for the data's language; a language without a template falls back to English. */
/**
 * The texts for a locale (a tag such as `es` or `pt-br`; its base language picks the texts, English when there are none).
 * Without a locale, the page language of the data. A multi-locale site renders each locale's page with its own locale.
 */
export const textsFor = (data: LegalData, locale?: string): Texts =>
  TEXTS[(locale ?? data.language).split('-')[0] as LegalLanguage] ?? EN;

/** Path of a locale's legal page (`/es/privacidad/`), or `undefined` when the data has no such page for that locale. */
export const legalPath = (
  data: LegalData,
  kind: 'privacy' | 'notice',
  locale: string,
): string | undefined =>
  data.locales?.find((entry) => entry.locale === locale)?.paths[kind];

/**
 * Where the privacy policy lives for a locale: the path in `legal.json` of a multi-locale site, else the page
 * `legal.mjs` assumes for the data's language (`/privacy/`, `/privacidad/`). Forms link their consent to it.
 */
export const privacyPath = (data: LegalData, locale?: string): string => {
  const slug = data.language === 'es' ? 'privacidad' : 'privacy';
  return (
    legalPath(data, 'privacy', locale ?? data.defaultLocale ?? data.language) ??
    `/${slug}/`
  );
};

/** The lead-forms record of the data, or `null` for older files (`forms: true`) and pages without forms. */
export const formsProcessing = (data: LegalData): FormsProcessing | null =>
  data.processing.forms && typeof data.processing.forms === 'object'
    ? data.processing.forms
    : null;

/** The email for privacy requests: the privacy contact, else the holder's email, else empty. */
export const privacyEmail = (data: LegalData): string =>
  data.privacyContact || data.holder.email;
