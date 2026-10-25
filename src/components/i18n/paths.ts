// URL helpers for a multi-locale site (Astro i18n routing, static output). They use the virtual module
// `astro:i18n`, which exists only when astro.config.mjs has an `i18n` block, so import this file only from sites
// that have one (the language switcher and the site's own src/i18n/urls.ts). Single-language sites never load it.
import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';

export interface Alternate {
  /** A locale, or `x-default`. */
  hreflang: string;
  /** Absolute when `site` is set in astro.config.mjs, root-relative otherwise. */
  href: string;
}

const trimEnd = (value: string) => value.replace(/\/+$/, '');

/**
 * The path of a page without its locale prefix, with no leading or trailing slash (`''` for a home page).
 * `/es/privacidad/` gives `privacidad`; the default locale has no prefix, so `/privacy/` gives `privacy`.
 */
export function pathWithoutLocale(
  pathname: string,
  locales: readonly string[],
): string {
  const path = trimEnd(pathname);
  // Longest locale root first, so `/es` wins over the default locale's empty root.
  const roots = locales
    .map((locale) => trimEnd(getRelativeLocaleUrl(locale)))
    .sort((a, b) => b.length - a.length);
  const root = roots.find((r) => path === r || path.startsWith(`${r}/`)) ?? '';
  return path.slice(root.length).replace(/^\/+/, '');
}

/** Root-relative URL of a page in a locale. `slug` is the path without the locale prefix, for example `privacy`. */
export const localeHref = (locale: string, slug = '') =>
  getRelativeLocaleUrl(locale, slug);

/**
 * `<link rel="alternate" hreflang>` targets for the current page: one per locale plus `x-default` (the default
 * locale). `slugs` overrides the unprefixed path per locale when a page has a different slug in each language
 * (`{ en: 'privacy', es: 'privacidad' }`); otherwise every locale gets the same path.
 */
export function alternateLinks({
  pathname,
  locales,
  defaultLocale,
  slugs,
}: {
  pathname: string;
  locales: readonly string[];
  defaultLocale: string;
  slugs?: Record<string, string>;
}): Alternate[] {
  const rest = pathWithoutLocale(pathname, locales);
  const href = (locale: string) =>
    getAbsoluteLocaleUrl(locale, slugs?.[locale] ?? rest);
  return [
    ...locales.map((locale) => ({ hreflang: locale, href: href(locale) })),
    { hreflang: 'x-default', href: href(defaultLocale) },
  ];
}
