# tupathdigital

Landing site `site-tupathdigital`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

```bash
npm run dev -w site-tupathdigital      # dev server
npm run build -w site-tupathdigital    # static build into sites/tupathdigital/dist/
npm run check -w site-tupathdigital    # astro check
npm run qa -- --site tupathdigital     # full QA for this site only
```

Pages project and production branch: [site.config.json](site.config.json). Asset licenses: [CREDITS.md](CREDITS.md).

## Editing content

Products and discount codes are edited without code in Pages CMS (see [.pages.yml](.pages.yml), labels in Spanish):

- `src/content/offer.json` ("Productos"): shelves, products, store listings (title, USD price, `https` URL), tags and the cover file name. A product with no cover shows a typographic card until its cover is added; new cover files come through the factory and their file name is then added to the cover list in `.pages.yml`.
- `src/content/coupons.json` ("Cupones"): code, discount, store and the last valid day. A coupon whose end date is before the build date is not shown, and with no active coupon the page has no coupon section.

Both files are validated by `src/content.config.ts` (a wrong value fails the build, so CI never deploys it). The business name, calls to action and social links still come from `brief.json`. See `docs/cms.md` in landing-factory.
