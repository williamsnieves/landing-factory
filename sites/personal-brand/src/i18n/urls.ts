// Bridge between BaseLayout and Astro's i18n routing. BaseLayout loads this file only when it exists, which is how
// single-language sites avoid importing `astro:i18n` (it fails to resolve without an `i18n` block in astro.config.mjs).
export { alternateLinks } from '../components/i18n/paths';
export { defaultLocale, locales } from './ui';
