# turnio

Landing site `site-turnio`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-turnio      # dev server
npm run build -w site-turnio    # static build into sites/turnio/dist/
npm run check -w site-turnio    # astro check
npm run qa -- --site turnio     # full QA for this site only
```

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).
