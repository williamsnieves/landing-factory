# sections

Page sections (hero, feature grid, pricing, FAQ, ...). Prefer `.astro` components: they ship no JavaScript. Use a React island (`.tsx` + `client:visible`) only where a section needs real interaction. Sections get motion through `data-*` attributes (see `../motion/README.md`), never through animation code of their own.
