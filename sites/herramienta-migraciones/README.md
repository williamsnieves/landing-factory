# herramienta-migraciones

Landing site `site-herramienta-migraciones`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-herramienta-migraciones      # dev server
npm run build -w site-herramienta-migraciones    # static build into sites/herramienta-migraciones/dist/
npm run check -w site-herramienta-migraciones    # astro check
npm run qa -- --site herramienta-migraciones     # full QA for this site only
```

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).
