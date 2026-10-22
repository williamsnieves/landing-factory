# Proposal: estudio-arquitectura

Status: **proposed**. Automatic run: no checkpoint, the plan below is built as written.

## Brief

- **Niche:** small architecture studio in Madrid specialised in housing rehabilitation and workspaces.
- **Brand (fictional or real):** fictional, "Estudio Larrea Vidal Arquitectura", Madrid. Address, phone, e-mail and registration data are placeholders and are marked as sample in the footer.
- **Goal of the page:** primary action: ask for a first conversation about a commission (e-mail link with a prepared subject). Secondary: see the projects and the method.
- **Audience:** private owners with a medium-high budget who are renovating a flat or house, and small companies that need an office or studio refitted.
- **Tone:** sober, precise, cultured. Short declarative sentences, no superlatives, technical words used correctly.

Signals: serious, premium, calm, technical, editorial-content, photo-rich

- **Language:** Spanish (`es`).
- **Site location:** `sites/estudio-arquitectura/`, its own Cloudflare Pages project.

## References used

| Sheet | What we take                                                                        | What we leave |
| ----- | ----------------------------------------------------------------------------------- | ------------- |
| none  | No reference sheets were given; only the generic archetype sheets steer the layout. | -             |

**Direction in one line:** a drawing-sheet page: a strict grid, a blueprint-ink accent on warm paper, thin rules like plan linework, and every project shown as a photograph next to its plan.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site estudio-arquitectura` (top candidate).

- **Primary:** swiss-grid-minimal
- **Secondary:** horizontal-chapter-story
- **Lent traits:** `chapter-index` (numbered chapters I to VII with a small index), `horizontal-chapter` (the projects travel sideways)
- **Why:** serious, premium, calm, technical and editorial-content all fit the Swiss grid, which also matches how architects draw: columns, rules, tabular numerals. Projects with photos suit a numbered, chaptered sequence. The top candidate is taken unchanged.
- **Twist from the requirement:** every project is a pair, a photograph and a plan. The plans are original line drawings made as inline SVG from code (no downloaded drawings), with a scale bar and room labels, and the hero draws one plan line by line.
- **Planned deviations:** the horizontal project track is a native CSS scroll-snap row, not a pinned ScrollTrigger section (no new motion primitive, no pin, keyboard and touch friendly, and it is already the no-JS and reduced-motion state). Hero is `split` with a plan on one side instead of a photo.

## Page map

| #   | Section        | Height | Purpose                                                   | Layout idea                                                                            |
| --- | -------------- | ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Hero           | 100svh | Say what the studio does and offer the first conversation | 12 columns, 5 + 7: statement and action at left, animated plan drawing at right        |
| 2   | Estudio (I)    | 60vh   | Position: rehabilitation, small team, how they think      | 3 + 9, number in the narrow column, two short paragraphs                               |
| 3   | Proyectos (II) | 130vh  | 5 projects, photo and plan each                           | Horizontal scroll-snap track of panels, one project per panel, index of projects above |
| 4   | Método (III)   | 130vh  | Five steps from survey to site                            | 4 + 8 with a sticky heading column, numbered rows ruled by thin lines                  |
| 5   | Ámbitos (IV)   | 90vh   | Housing and workspaces, what each includes                | 6 + 6 two columns with a photo each, rectangular                                       |
| 6   | Pausa          | 80vh   | One quiet image and one line                              | Full-bleed photograph with a caption on the grid                                       |
| 7   | Encargo (V)    | 80vh   | How an enquiry becomes a commission, what to bring        | 3 + 9, four ruled stages, a short list of what to send                                 |
| 8   | Contacto (VI)  | 80vh   | Convert: e-mail and phone, the same action as the header  | Large flush-left sentence, one rectangular button, contact data in columns             |
| 9   | Pie            | 40vh   | Sample-data note, credits, links                          | Quiet columns, small type                                                              |

One conversion action: "Pedir una primera conversación", in the header, in a block closing the Projects section and in the Contacto section.

## Motion plan

| Moment            | Trigger              | Type                               | Notes                                    |
| ----------------- | -------------------- | ---------------------------------- | ---------------------------------------- |
| Block reveal      | enters viewport      | `data-reveal`                      | slow fade and rise on headings and rows  |
| Hero plan drawing | on load              | CSS stroke-dashoffset on SVG paths | the playful moment; one run, about 2.5 s |
| Project track     | user scroll or swipe | native scroll-snap                 | no pin, no JavaScript                    |
| Chapter index     | scroll               | `data-reveal` only                 | static labels, no scrubbed state         |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; the plan is drawn in its final state and all content is visible. Without JavaScript the page reads top to bottom with every section visible, the track scrolls natively.

## Visual direction

- **Type:** a neutral grotesque for headings and a humanist sans for text, two weights, small contrast, sentence case, flush left, tabular numerals. Fonts fixed by the design-system step.
- **Palette:** warm paper ground, near-black graphite ink, one blueprint blue accent (a deep ink blue, not violet), a pale grey for rules. No gradients.
- **Hero type:** `split`.
- **Imagery:** openly licensed photographs of interiors, refurbished buildings and workspaces from Wikimedia Commons, rectangular, no radius, with captions; plans are original SVG drawings. Stock photos are representative, never presented as the studio's own work.

## 3D

None.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | -       | -      | -               | -                       |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages.

## Decisions

1. Assumed: the brand name, city district, address, phone, e-mail, project names, surfaces, years and client descriptions are invented sample data (confirm at the checkpoint).
2. The page uses stock photos and sample data to replace before launch; it never says the photos are the studio's work.
3. The contact action is a `mailto:` link and a phone link, since backend forms are out of scope.
4. The copy makes no claims about awards, publications, licences, number of finished works or years of experience, and no client testimonials; it describes method and services plainly.
5. Honorarios are not published; the page says they are agreed after the first visit.
