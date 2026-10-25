// UI dictionary of the site: the short interface strings (skip link, language switcher label, AI disclosure,
// credits label, navigation) by locale. Page copy is not here: it lives in src/content/<locale>.ts as natural
// text, never as a word-for-word translation. To add a string, add the key to `Dictionary` and then to every
// locale (TypeScript fails on a missing one).

/** Must match i18n.locales in astro.config.mjs (the folder names under src/pages/); check-landing verifies it. */
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export interface Dictionary {
  skipToContent: string;
  language: string;
  aiDisclosure: string;
  photoCredits: string;
  logoAlt: string;
  navLabel: string;
  menu: string;
  navAbout: string;
  navAi: string;
  navPath: string;
  navSkills: string;
  navBeyond: string;
  linkedin: string;
  github: string;
  footerPage: string;
  footerElsewhere: string;
  backToTop: string;
  rights: string;
}
export type UiKey = keyof Dictionary;

export const ui: Record<Locale, Dictionary> = {
  en: {
    skipToContent: 'Skip to content',
    language: 'Language',
    aiDisclosure: 'Some images on this page were generated with AI.',
    photoCredits: 'Photo credits',
    logoAlt: 'Willians Nieves logo: a W between code braces',
    navLabel: 'Main',
    menu: 'Menu',
    navAbout: 'About',
    navAi: 'AI',
    navPath: 'Path',
    navSkills: 'Skills',
    navBeyond: 'Beyond code',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    footerPage: 'On this page',
    footerElsewhere: 'Elsewhere',
    backToTop: 'Back to top',
    rights: 'All rights reserved.',
  },
  es: {
    skipToContent: 'Saltar al contenido',
    language: 'Idioma',
    aiDisclosure: 'Algunas imágenes de esta página se generaron con IA.',
    photoCredits: 'Créditos de las fotos',
    logoAlt: 'Logotipo de Willians Nieves: una W entre llaves de código',
    navLabel: 'Principal',
    menu: 'Menú',
    navAbout: 'Sobre mí',
    navAi: 'IA',
    navPath: 'Trayectoria',
    navSkills: 'Skills',
    navBeyond: 'Más allá del código',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    footerPage: 'En esta página',
    footerElsewhere: 'En otros sitios',
    backToTop: 'Volver arriba',
    rights: 'Todos los derechos reservados.',
  },
};

/** The dictionary of a locale (the default locale's when the locale is unknown or undefined). */
export function t(locale: string | undefined): Dictionary {
  return ui[locale as Locale] ?? ui[defaultLocale];
}
