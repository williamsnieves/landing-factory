// UI dictionary of the site: the short interface strings (skip link, language switcher label, AI disclosure,
// credits label) by locale. Page copy is not here: write it in each locale's own page or content file as natural
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
  underConstruction: string;
}
export type UiKey = keyof Dictionary;

export const ui: Record<Locale, Dictionary> = {
  en: {
    skipToContent: 'Skip to content',
    language: 'Language',
    aiDisclosure: 'Some images on this page were generated with AI.',
    photoCredits: 'Photo credits',
    underConstruction: 'This site is under construction.',
  },
  es: {
    skipToContent: 'Saltar al contenido',
    language: 'Idioma',
    aiDisclosure: 'Algunas imágenes de esta página se generaron con IA.',
    photoCredits: 'Créditos de las fotos',
    underConstruction: 'Estamos preparando esta web.',
  },
};

/** The dictionary of a locale (the default locale's when the locale is unknown or undefined). */
export function t(locale: string | undefined): Dictionary {
  return ui[locale as Locale] ?? ui[defaultLocale];
}
