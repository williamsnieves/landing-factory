# postproduction-studio

Landing site `site-postproduction-studio`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-postproduction-studio      # dev server
npm run build -w site-postproduction-studio    # static build into sites/postproduction-studio/dist/
npm run check -w site-postproduction-studio    # astro check
npm run qa -- --site postproduction-studio     # full QA for this site only
```

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).
