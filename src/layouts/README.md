# layouts

Page shells. `BaseLayout.astro` emits `lang`, title, meta description, Open Graph, viewport, a skip link and `<main id="main">`. Slots: `head` (extra head tags such as `<Motion />`), `header`, default (inside `<main>`), `footer`.

Props: `title`, `description`, `lang` (default `en`, or the current locale on a multi-locale site), `ogImage`, `noindex`, `skipLabel` (text of the skip link, default `Skip to content`) and `localeSlugs`.

## Multi-locale sites

A site created with `npm run new-site -- <slug> --langs en,es` uses Astro's built-in i18n routing (`i18n` in `astro.config.mjs`, default locale at the root, the others under `/<locale>/`). The layout then:

- sets `<html lang>` from `Astro.currentLocale` (pass no `lang`);
- emits `<link rel="alternate" hreflang="<locale>">` for every locale plus `hreflang="x-default"` (the default locale) on indexable pages, absolute when `site` is set in `astro.config.mjs`, root-relative otherwise; the canonical link already points at the page itself;
- gets the alternates from the site's own `src/i18n/urls.ts`, which only multi-locale sites have: `import.meta.glob` finds nothing in a single-language site, so it never imports `astro:i18n` (that module fails to resolve without an `i18n` block). Pages whose slug differs per locale pass `localeSlugs={{ en: 'privacy', es: 'privacidad' }}`.

The language switcher is `src/components/i18n/LanguageSwitcher.astro` (real links, `aria-current` on the active language, no JavaScript, no redirect by browser language). Interface strings live in the site's `src/i18n/ui.ts`.
