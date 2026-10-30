# casavela

Landing site `site-casavela`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-casavela      # dev server
npm run build -w site-casavela    # static build into sites/casavela/dist/
npm run check -w site-casavela    # astro check
npm run qa -- --site casavela     # full QA for this site only
```

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).
