# personal-brand

Landing site `site-personal-brand`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-personal-brand      # dev server
npm run build -w site-personal-brand    # static build into sites/personal-brand/dist/
npm run check -w site-personal-brand    # astro check
npm run qa -- --site personal-brand     # full QA for this site only
```

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).

Languages: en, es (default `en`, served at the root; the others under `/<locale>/`). Routing is Astro's built-in i18n (`i18n` in astro.config.mjs); `src/i18n/ui.ts` holds the interface strings, `src/components/i18n/LanguageSwitcher.astro` the switcher.
