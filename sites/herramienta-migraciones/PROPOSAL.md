# Proposal: herramienta-migraciones

Status: **approved** (owner, 2026-11-12, with the GitHub action changed to a visual-only element). Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Source:** the niche line only (no `sites/herramienta-migraciones/brief.json`). Every decision below is assumed and listed under Decisions.
- **Niche:** open-source command-line tool for database migrations (demo, no real customer). The front page is a changelog-style index with version and date; then installation with a terminal block, principles, documentation and community. Call to action: Install, or View on GitHub. Technical, few images, no photos.
- **Brand (fictional or real):** fictional. **Estrato**, a CLI called `estrato` (a stratum is one layer of a schema's history; each migration is a layer). Fictional open-source project, no city.
- **Goal of the page:** primary action **Instalar** (jumps to the install section with the commands); secondary action **Ver en GitHub**, a visual-only element with no link (owner decision at the checkpoint: no invented repository URL).
- **Audience:** backend developers, DevOps and small teams who change a relational schema (PostgreSQL, MySQL, SQLite) and today run SQL scripts by hand or with a framework-bound tool.
- **Tone:** sober, precise, unhurried; a tool's voice, short sentences, no hype.
- **Signals:** technical, product-showcase, editorial-content, calm, few-assets

Signals: technical, product-showcase, editorial-content, calm, few-assets

- **Language:** Spanish (`es`).
- **Site location:** `sites/herramienta-migraciones/`, deployed to the target in its `site.config.json` (Cloudflare Pages by default).

## References used

| Sheet                    | What we take                                                                                                                                                                                                                                                          | What we leave                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/claude-dev.md` | The tool-like typesetting (mono metadata, humanist sans for titles), an index list as the hero instead of an image, hairline rows with metadata pushed to both edges, a sticky identity column on the left, one small original motif, a generative dot field to close | The mascot and pixel icon set (their own characters; our motif is a stepped "strata" shape), bracketed shortcut letters (no real shortcuts here), the video block, the newsletter input, the overlapping mascot collage |

**Direction in one line:** a calm, type-led developer page where the release history is the hero and every section reads like one more migration applied in order.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site herramienta-migraciones --refs claude-dev` (impact `balanced`, assumed).

- **Primary:** `dev-console`
- **Secondary:** `chaptered-atlas`
- **Lent traits:** `self-map-hero` (from chaptered-atlas), plus `mono-meta-rows` and `generative-dot-field` owned by the primary. `chapter-color-fields` is **not** borrowed.
- **Why:** the signals (technical, product-showcase, editorial-content, calm, few-assets) all sit in dev-console's `fits`, and dev-console already owns the claude-dev traits that matter (`mono-meta-rows`, `generative-dot-field`). The picker's top result was `custom` (reference-led), but its extra reference traits (`overlap-collage`, `visible-grid`) are noise for this page and `overlap-collage` is rejected by dev-console; since dev-console is the grammar that reference distils, taking it as primary keeps the reference direction while giving the build a defined grammar and signature range. chaptered-atlas lends only `self-map-hero`, because the requirement literally asks for a front page that indexes the page; its saturated colour fields would break the calm signal it avoids.
- **Twist from the requirement:** the page is a migration history. The self-map in the hero is drawn as a migration chain (`0001_instalar → 0002_principios → 0003_documentacion → 0004_comunidad`), each node a link to its section, and each section opens with a mono migration id as its label.
- **Planned deviations:** the self-map's node diagram is drawn on the warm light ground in hairline strokes, not on a dark panel (calm signal, dev-console palette). The page has nine release rows, near dev-console's minimum of about eight real entries; they are sample releases of a fictional project (see Decisions).

## Signature moment

- **Section:** Instalación (`#instalar`).
- **What it shows:** a large terminal block running a first session: install, `estrato init`, `estrato new crear_usuarios`, `estrato up`, each migration applied line by line with its id, a check and a duration-free "aplicada" status, ending in `estrato status` showing the chain up to date.
- **Technique:** motion and scale: the terminal is the widest, darkest block of an otherwise light page; its output lines reveal one after another (staggered `data-reveal`) when the block enters the viewport, with a blinking cursor at the end.
- **Reduced motion and no JavaScript:** the full session is visible at rest as real, selectable text; no cursor blink.
- **Brief facts used:** none from a customer (no brief); the commands are the fictional tool's own sample commands, listed under Decisions.

## Page map

| #   | Section                    | Height | Purpose                              | Layout idea                                                                                                                                                                                                                                                                                          |
| --- | -------------------------- | ------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Header                     | 0.1 vh | Navigation and the action            | Strata mark and `estrato` in mono on the left; Instalar, Principios, Documentación, Comunidad in small uppercase mono; one near-black rectangular button "Instalar" on the right                                                                                                                     |
| 1   | Índice (`#indice`)         | 1.6 vh | Hero: what it is, history, self-map  | Asymmetric split: sticky left third with `estrato` in large mono, the h1 and two lines, "Instalar" button and "Ver en GitHub" link; right two thirds: the migration-chain map (SVG nodes linking to sections), a featured row for the latest release (accent tile), then eight hairline release rows |
| 2   | Por qué (`#por-que`)       | 0.8 vh | Problem and agitation, calm          | Same two-column frame: mono label `0001` on the left, three hairline rows on the right, each naming one plain pain (scripts run by hand, environments that drift, no record of what ran)                                                                                                             |
| 3   | Instalación (`#instalar`)  | 1.2 vh | Solution in action; signature moment | Three install rows (Homebrew, npm, binary) as mono command rows, then the large terminal session block across the content width                                                                                                                                                                      |
| 4   | Cómo funciona (`#como`)    | 0.8 vh | How it works                         | Four numbered rows (init, new, up, down/status) with a small stepped SVG diagram of layers stacking in the left column                                                                                                                                                                               |
| 5   | Principios (`#principios`) | 0.9 vh | Why trust the design                 | Six principles as `mono-meta-rows`: number left, sans title, one-line explanation, mono keyword on the right edge (plain SQL, reversible, one runner at a time, checksums, no daemon, CI-ready)                                                                                                      |
| 6   | Documentación (`#docs`)    | 0.7 vh | Where to go next                     | An index of five doc topics as rows with a mono path on the right; links go to the repository's docs folder (placeholder)                                                                                                                                                                            |
| 7   | Comunidad (`#comunidad`)   | 0.7 vh | Belonging and contribution           | Four rows: contribute, discussions, code of conduct, license; a small dot-cluster SVG in the left column                                                                                                                                                                                             |
| 8   | Cierre (`#cierre`)         | 0.9 vh | Ending: repeat the primary action    | Short line, "Instalar" button and "Ver en GitHub" link, then the full-width generative dot field (SVG generated at build time)                                                                                                                                                                       |
| 9   | Footer                     | 0.3 vh | Links and the demo notice            | Name and license line on the left, two short link columns with mono labels; the line "Proyecto de demostración: versiones, fechas y enlaces son de muestra"                                                                                                                                          |

## Motion plan

Only primitives from `src/components/motion/README.md`.

| Moment                      | Trigger | Type                     | Notes                                                                         |
| --------------------------- | ------- | ------------------------ | ----------------------------------------------------------------------------- |
| Hero release rows and lines | load    | reveal, staggered        | Fade from transparent, row after row                                          |
| Hero identity column        | scroll  | CSS `position: sticky`   | Not a ScrollTrigger pin; no pin-spacer                                        |
| Terminal session (playful)  | enter   | reveal, staggered        | The one playful moment; lines appear in order, cursor blinks at the end       |
| Section rows                | enter   | reveal                   | Subtle fade                                                                   |
| Closing dot field           | visible | slow CSS drift of groups | Paused off screen through `animation-play-state`; static under reduced motion |

No pinned section, no smooth-scroll library (Lenis off, as the reference keeps native scroll), no parallax.

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:** a monospace for the product name, labels, versions, dates, commands and navigation; a humanist sans for the h1, titles and reading text. Small, close sizes (ratio about 1.2); the product name in mono is the largest element. Regular weights; hierarchy from size, family and grey level.
- **Palette:** a warm near-white ground, three or four warm greys for text, a near-black for the button and the terminal ground, and one earthy accent used only for the strata mark, the featured tile and the chain's current node: moss green or deep plum, avoiding the teal, blue, indigo, orange, amber, lime, magenta, vermilion and burgundy families other sites use. No gradients, no glow.
- **Hero type:** `typographic`.
- **Imagery:** no photographs (the niche says so, and dev-console forbids stock). All visuals are SVG or CSS art made in the build: the strata mark (header and favicon), the migration-chain map in the hero, the stepped layers diagram in Cómo funciona, a dot cluster in Comunidad and the closing dot field. Pixabay and Commons are not searched; that goes in RUN.md Images. The terminal is real HTML text, not an image.

## SEO

- **Primary keyword:** "migraciones de bases de datos" (assumed).
- **Service area:** none (an online open-source project).
- **Schema type:** `SoftwareApplication` (assumed), with name, description, `applicationCategory: DeveloperApplication`, `operatingSystem` and `offers` price 0 only if presented as free; no review or rating markup.
- **Title and description per page:** home title about "Estrato: migraciones de bases de datos desde la terminal" (within 30 to 60 characters), description of 70 to 160 characters with the keyword; one `h1`; the keyword in the h1, the description and the first paragraph. `seo-audit` rules for a non-local software page apply; no local SEO. The 404 page gets its own title and stays `noindex`.

## Copy plan

- **Framework:** PAS (`node scripts/pick-copy-framework.mjs`, score 5: fits a problem-aware visitor, fits goal lead). Kept. The Agitate stage stays mild to honour the calm emotional target: it names consequences plainly, never with fear.
- **Awareness:** `problem-aware` (assumed: no brief).
- **Stage to section:**

| Section       | Stage    | What it says                                                                                   | Facts it uses                       |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| Índice (hero) | Problem  | One line naming the job (schema changes in order, everywhere), the tool's name and its history | sample releases and dates (assumed) |
| Por qué       | Agitate  | Three plain pains: hand-run scripts, drifting environments, no record of what ran              | none (generic to the niche)         |
| Instalación   | Solution | Install in one command; a first session applied in order                                       | sample commands (assumed)           |
| Cómo funciona | Solution | Four commands, what each does                                                                  | sample commands (assumed)           |
| Principios    | Solution | Six design principles that make it predictable                                                 | sample product behaviour (assumed)  |
| Documentación | Solution | Where to learn each part                                                                       | sample doc topics (assumed)         |
| Comunidad     | Solution | How to take part; license                                                                      | sample license MIT (assumed)        |
| Cierre        | Solution | Repeat "Instalar" and "Ver en GitHub"                                                          | none                                |

- **Hero headline candidates (4U: useful, urgent, unique, ultra-specific, 1 to 4 each):**
  1. "Migraciones de bases de datos en el mismo orden, en cada entorno." U3 / U1 / U3 / U3 = 10 **(chosen: carries the keyword and the core promise of order without promising a result)**
  2. "Cada cambio de esquema, versionado como tu código." U3 / U1 / U2 / U2 = 8
  3. "SQL que se aplica, se registra y se deshace." U3 / U1 / U2 / U3 = 9
- **Proof inventory:** no proof available (no brief, fictional project): no stars, downloads, users, company logos or testimonials. The Principios section carries the trust stage with the tool's own design.

## Conversion plan

- **Emotional target:** calm (secondary: trust). A schema change is a nervous moment for a developer; the page should feel orderly and predictable, matching the tone.
- **Attention path:** focal point is the large mono name and the h1 in the sticky left column; the one primary call to action is **"Instalar"** (header button and hero button, near-black solid, to `#instalar`); the secondary "Ver en GitHub" is a visual-only element styled as an underlined text link with a "demo" tag, visibly weaker. No gaze cue (no photos).
- **Choice:** no offers or prices (a free open-source tool). The install section shows three install methods as equal rows; Homebrew first only because it is the shortest command, not highlighted.
- **Trust and risk:** no proof; trust comes from the plain principles, the visible release history, the license line and the public repository link. No guarantee (none stated). No contact data beyond the repository (fictional project). No legal pages (no market; see Decisions).
- **Ending:** the Cierre section repeats "Instalar" and "Ver en GitHub" above the dot field.
- **Ethics check:**
  - [x] Every claim comes from the plan; the sample data is labelled as sample on the page and listed under Decisions.
  - [x] No urgency or scarcity.
  - [x] No fear or anger; the Agitate stage is plain.
  - [x] No decline flow (no forms, no popups), so no confirmshaming.
  - [x] No checkboxes or forms.
  - [x] No price; the tool is presented as free and open source.
  - [x] No highlighted option.
  - [x] No social proof of any kind.
  - [x] No people in images (no images of people at all).
  - [x] "Instalar" leads to the install commands; "Ver en GitHub" is visual only and marked "demo", it leads nowhere.
  - [x] Not a vulnerable audience.
  - [x] Nothing depends on the visitor not noticing it.

## 3D

None. The closing dot field is an SVG generated at build time with CSS drift, not a Three.js scene.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | -       | -      | -               | -                       |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages, a real documentation site, a newsletter, real keyboard shortcuts.

## Decisions

1. Assumed: no brief; Estrato is a fictional open-source project and the page is a demo. All versions, dates, release titles, commands, install methods, supported databases (PostgreSQL, MySQL, SQLite), doc topics and the MIT license are sample data; the footer says "Proyecto de demostración: versiones, fechas y enlaces son de muestra" (confirm at the checkpoint).
2. Owner decision (checkpoint): no repository URL is invented. "Ver en GitHub" and every repository or documentation link are visual-only elements (a `span` styled as the secondary link, `aria-disabled="true"`, with a small mono "demo" tag), never an `a` with an empty or invented `href`. Documentation rows and community rows are text without links, or link to sections of this page.
3. Assumed: primary action "Instalar" to `#instalar`, secondary "Ver en GitHub" (confirm at the checkpoint).
4. Assumed: impact `balanced` (picker default without a brief) (confirm at the checkpoint).
5. Assumed: awareness `problem-aware`, framework PAS (confirm at the checkpoint).
6. Assumed: primary keyword "migraciones de bases de datos", schema `SoftwareApplication`, no service area (confirm at the checkpoint).
7. Archetype: `dev-console+chaptered-atlas` chosen over the picker's top `custom` result, reasons under "Archetype blend".
8. Images: no photos and no stock; all visuals are SVG and CSS art made in the build. No AI images (none needed).
9. Legal requirements unknown: no brief, no market. No legal pages, no forms, no cookies, no trackers, self-hosted fonts.
10. Diversity: hero `typographic` is shared with three sites, so the primary colour family (moss or plum) and a monospace display font differ from every site's trio.
11. Deploy target: `cloudflare` (default, no brief).
