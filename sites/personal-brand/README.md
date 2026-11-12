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

## Editing content

The career (`src/content/career.json`: jobs and earlier roles) and the skill groups (`src/content/skills.json`) are plain JSON, validated by the content collections in `src/content.config.ts` and editable without code in Pages CMS through `.pages.yml` (labels in Spanish). Facts shared by both languages are stored once; sentences are stored as `{ "en": ..., "es": ... }`. Everything else (labels, headings, intros, hero, about) stays in `src/content/en.ts` and `es.ts`. A wrong value fails `npm run check` and the build. While the landing is managed from the factory, the CMS paths belong to the repository: see [docs/cms.md](../../docs/cms.md) (pull with `scripts/cms.mjs pull` before changing them in the factory).
