# Run log: herramienta-migraciones

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Open-source command-line tool for database migrations (demo, no real customer): changelog-style index front page with version and date, install section with a terminal block, principles, documentation and community; CTA Install or View on GitHub. Technical, few images, no photos. |
| Brief           | none (no `sites/herramienta-migraciones/brief.json`): every decision is assumed                                                                                                                                                                                                          |
| References      | `patterns/claude-dev.md` (`--refs claude-dev`)                                                                                                                                                                                                                                           |
| Sources         | pixabay, commons                                                                                                                                                                                                                                                                         |
| Language        | es                                                                                                                                                                                                                                                                                       |
| Mode            | first run interactive (stopped at the checkpoint); resumed 2026-11-12T11:50:18Z with `--resume --auto` after the owner approved PROPOSAL.md                                                                                                                                              |
| Max QA attempts | 5                                                                                                                                                                                                                                                                                        |
| Started         | 2026-11-12T09:40:20Z                                                                                                                                                                                                                                                                     |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                                              |
| ------------- | ------ | -------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| brief         | done   | 2026-11-12T09:40:20Z | 2026-11-12T09:41:00Z | No brief; niche and the claude-dev sheet read                                                      |
| synthesis     | done   | 2026-11-12T09:41:00Z | 2026-11-12T09:42:30Z | PROPOSAL.md proposed: dev-console+chaptered-atlas (self-map-hero), PAS, calm, no photos            |
| checkpoint    | done   | 2026-11-12T09:42:36Z | 2026-11-12T11:50:40Z | Approved by the owner (GitHub action visual-only); resumed with `--auto`                           |
| design-system | done   | 2026-11-12T11:50:40Z | 2026-11-12T11:56:19Z | MASTER.md: moss #4a6741, Fira Code + Fira Sans, warm greys; tokens, contrast, diversity ok         |
| build         | done   | 2026-11-12T11:56:19Z | 2026-11-12T12:12:22Z | 10 sections, all art in SVG/CSS, terminal signature; credits and astro check pass                  |
| qa            | done   | 2026-11-12T12:12:22Z | 2026-11-12T12:14:00Z | Passed on attempt 1 (Lighthouse worst 98/100/100); section review; conversion review: no edits     |
| polish        | done   | 2026-11-12T12:14:00Z | 2026-11-12T12:14:30Z | impeccable detect: 0 findings on src; 35 static-HTML hints judged false positives; no edits        |
| final-check   | done   | 2026-11-12T12:14:30Z | 2026-11-12T12:26:41Z | Layers pruned; layout-diversity fixed (rows as 3 columns, minimal footer, sticky labels); all pass |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

- Blend `dev-console+chaptered-atlas` (traits `self-map-hero`, `mono-meta-rows`, `generative-dot-field`), hero `typographic`.
- Copy: framework PAS, awareness `problem-aware` (assumed, no brief). Headline as planned: "Migraciones de bases de datos en el mismo orden, en cada entorno." No proof, figures, urgency or superlatives.
- Signature moment: built as planned (the terminal session in `#instalar`, lines revealed in order, cursor blink off under reduced motion, full text without JavaScript).
- ui-ux-pro-max vs proposal (MASTER.md lists each): its dark slate page, run green, star gold, glow, search hero and mono-only system were set aside for the proposal's warm light ground, moss accent, two families and index hero. JetBrains Mono and IBM Plex Sans were skipped because other sites use them; Fira Code and Fira Sans came from the skill's own pairings. Ligatures off on all mono text.
- design-taste-frontend (direction `quiet-instrument`, composition only): its bans on mono outside code, index numbering, hairlines and small uppercase labels, its demand for photos, its dark split hero with a live control, its founder letter, single-line footer, masked-headline motion and single typeface all lost to the proposal and MASTER.md.
- Section labels: the page map's `0001` for Por qué clashed with the fixed chain (`0001_instalar`), so Por qué is `0000_punto_de_partida`, Cómo funciona `0001.1_como_funciona`, the closing section `0005_tu_esquema · pendiente`; the hero opens with `índice · v0.9.0`.
- "Historial de versiones" is a small mono heading in sentence case (no decorative uppercase titles); no category filter row above the list (nothing real to filter); the header is not sticky.
- Hero h1 holds the `estrato` wordmark and the headline (one h1, keyword kept) so the product name is the largest element, as dev-console asks.
- Final-check deviations for `layout-diversity` (first measure: distance 0.06 to app-finanzas, 0.18 to estudio-arquitectura): the meta rows' key, title and right-edge detail are separate paragraphs, so rows read as three columns (key, title, detail), and the right detail has a minimum width so it aligns; the left column of every section frame (the migration label and drawing) is sticky from 1024 px, like the hero's identity column; the footer became the minimal form dev-console allows (identity on the left, one line of in-page links and the demo notice on the right) instead of link columns; the section labels are lightly tracked. Result: the check passes against all 11 sites.
- `archetype-target` warnings accepted as deliberate: `cols2Share 0` and `splitRatio 0` (rows read as three columns, see above) and `stickyCount 6` (sticky labels in every section frame instead of only the hero). Heading scale (3.3) and eyebrow share (1.0) are now inside the ranges.
- Dates, versions and release titles are sample data of a fictional project (dev-console's "no invented dates" rule is bent by the proposal's Decision 1, and the footer says so).

## Images

- Images: 0 raster files. No photos, no stock, no AI images (none needed; the niche says no photos and dev-console forbids stock). Pixabay and Commons were not searched.
- Visuals drawn in code (inline SVG): the strata mark (header, footer, `public/favicon.svg`), the migration-chain map (hero, nodes link to sections), a drifting-environments drawing (Por qué), a stepped layers diagram (Cómo funciona), a dot cluster (Comunidad) and the generative dot field (Cierre, seeded at build time, CSS drift paused off screen, still under reduced motion). The terminal is real text.
- AI images: none. `assets.json` is empty; `credits.mjs` reports it in sync.

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes                                                                                                                 |
| --- | ------- | ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | passed  | none              | -     | Lighthouse worst: performance 98, accessibility 100, SEO 100; impeccable 0 findings; reduced motion pass (86 reveals) |
| 2   | passed  | none              | -     | After pruning unused layers (3D, legal, forms, maps)                                                                  |
| 3   | passed  | none              | -     | After the layout-diversity changes                                                                                    |
| 4   | passed  | none              | -     | After a type fix in the footer (`astro check`); Lighthouse worst performance 99                                       |

Section screenshots (375, 768, 1440 px and the 404) reviewed: no repeated or mismatched visuals, no clipped or overlapping type, terminal readable and scrollable inside itself at 375 px, the 404 is restyled and links home and to `/#instalar`. Inline commands show the wide space of the monospace face (not a bug).

## Conversion review

- Audit (`node scripts/conversion-audit.mjs --site herramienta-migraciones`): 0 warnings, 1 info: `legal-linked` on `/` (no legal page was built: no brief, no market).
- Changed: nothing; the one primary action "Instalar" sits in the header, the hero and the closing section, and "Ver en GitHub" stays the weaker, visual-only element.
- For a person: the legal pages once a market is known; a real repository URL for "Ver en GitHub" (owner decision: none invented).
- Conversion plan items the page could not honor: none.

## Final check

- `site-layers prune`: removed `src/components/three/`, `src/scenes/`, `three`, `@types/three`, `src/components/legal/`, `src/components/forms/`, `src/components/maps/` (none used); `npm install` run; `npm run lint` passes (ESLint, knip, layer check for 12 sites).
- Prettier: `npx prettier --check .` passes. `credits.mjs --check`: up to date. `npm run check:sites`: 0 errors in all 12 sites.
- `layout-signature.mjs --write` then `check-landing --refs https://claude.dev/`: PASSED (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, layout-diversity, scenes, copy-claims, dark-patterns, visual-assets, originality). Warning: `archetype-target` (see Design decisions).
- Legal: no market (no brief), so no `legal.mjs` run; the report warns "legal requirements unknown".
- Static report (`--only static --skip audit`): PASSED, 0 fail, 5 warn: legal requirements unknown; no absolute canonical URL, no `og:url`, relative sitemap URLs and no `Sitemap:` line in robots.txt (all need `site` in `astro.config.mjs`, unknown without a domain); no `og:image` (the page has no raster image to share).
- `impeccable detect` on the built HTML (outside QA's gate): 34 `cramped-padding` hints on the hairline rows (the rows have 16 px of vertical padding; the screenshots show it, the static scan cannot) and 1 `cream-palette` (the warm ground is the proposal's and dev-console's choice). Not changed.

### To confirm before launch

- A person must read the whole copy before publishing.
- Sample data of a fictional project: every version, date, release title, command, install method, supported database, documentation topic and the MIT license (the footer says so).
- "Ver en GitHub" and the documentation entries are visual-only (`aria-disabled`, "demo" tag): add a real repository URL to make them links.
- Set `site` in `astro.config.mjs` once a domain exists (canonical, `og:url`, sitemap, robots `Sitemap:` line), and consider an `ogImage`.
- Legal requirements unknown: no market named.
- No `copy-claims` or `visual-assets-sparse` warnings.

### To fetch by the owner

Nothing.

## Totals

Wall clock: about 2 minutes for brief and synthesis (first run), then about 36 minutes from the resume (11:50:18Z) to the end of the final check (12:26:41Z). Subagents: design system about 141k tokens, build about 268k tokens.

Usage: input 30 tokens, output 16,615, cache write 126,631, cache read 1,905,560, cost $1.7266 USD, 22 turns (reported by Claude Code).

Usage: input 126 tokens, output 40,410, cache write 85,389, cache read 12,467,069, cost $13.6379 USD, 85 turns (reported by Claude Code).
