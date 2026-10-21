# Design

## Context

See `proposal.md` and `docs/product-plan.md`. The owner's direction (2026-10-21): archetypes are the base, but they must be mixable and driven by what comes from the requirement, so results can be original rather than picked from a menu. The requirement today is the proposal's Brief section (the `brief.json` intake is the next change, `add-brief-intake`); this change reads signals from the Brief and will read `brief.json` once it exists.

## Goals / Non-Goals

**Goals:** visibly different compositions across sites; a blend chosen for reasons the reviewer can read; a diversity measure that catches same-layout-new-color.

**Non-Goals:** regenerating existing sites; new motion primitives beyond what an archetype needs from the existing ones (small additions are allowed per site); the intake interview (next change); per-customer brand books.

## Decisions

1. **Archetype sheets** (`design-archetypes/<name>.md`) with YAML front matter: `name`, `summary`, `signals.fits` and `signals.avoid` (requirement traits, e.g. `premium`, `playful`, `technical`, `heritage`, `local-service`, `product-showcase`, `storytelling`, `data-heavy`, `photo-rich`, `few-assets`), `lends` (named traits another archetype may borrow, e.g. `marquee-type`, `split-sticky`, `horizontal-chapter`, `bento-grid`), `hero` (allowed hero types), and `signature` targets (expected ranges of the layout-signature features). Body: grid and section grammar, header and footer, typography treatment (scale contrast, case, alignment), imagery treatment (crop, full-bleed, collage, none), buttons and links, motion signature (which primitives, how often), do and don't. Starting set: editorial magazine, Swiss grid minimal, brutalist raw, typographic poster, horizontal chapter story, bento product showcase, collage scrapbook, immersive scene (3D or full-bleed media), warm local service, data and proof. Written in our own words; no reference site is named as a template.
2. **`scripts/validate-archetypes.mjs`** checks front matter fields, known trait and signal names, and that `lends` traits are defined in their sheet; runs in CI with `validate:patterns`.
3. **`scripts/pick-archetypes.mjs --site <slug> [--json]`** reads signals from the site's `PROPOSAL.md` Brief (a `Signals:` line the synthesis writes, from a closed vocabulary) or `brief.json` when present, scores each archetype (fits minus avoids, plus asset availability), drops primary/secondary pairs already recorded in other sites' `landing-meta` (`archetype: primary+secondary`), and prints the top blends with the matching signals as reasons. Deterministic, so the run log can be reproduced.
4. **Blend rules:** the primary archetype owns the layout grammar (grid, section patterns, header, footer, hero type); the secondary lends one or two named traits only. The synthesis may add one requirement-driven twist (for example a product's physical texture or a ritual of the business) that is described in the proposal. `landing-meta` gains `archetype: <primary>[+<secondary>]` and `traits: [...]`.
5. **De-anchoring:** SKILL.md and the `new-site` templates stop citing panaderia files as examples; structure examples move into the archetype sheets and neutral templates. The footer credit line is described as a requirement, not by pointing to a site.
6. **`scripts/layout-signature.mjs --site <slug> [--write]`** builds or uses `dist/`, loads each page in Chromium at 1440 and 375 px, and extracts: section count; per section a grid pattern (column count of the main content, split ratio, full-bleed media); median radius of images and of buttons; button shape (`pill`, `rect`, `text`); heading scale ratio (h1 to body) and dominant alignment; eyebrow labels per section; share of full-bleed media; words per viewport; footer type (`wordmark`, `columns`, `minimal`); and a 64-bit difference hash of each viewport-height slice at 1440. `--write` stores `sites/<slug>/layout-signature.json` (committed, small).
7. **Diversity rule** in `check-landing`: for each other site with a signature, compute a feature distance (normalized, weighted; documented in the script) and the share of matching screenshot hashes (Hamming distance under a threshold). Fail when the feature distance is under `diversity.minLayoutDistance` or the hash match share is over `diversity.maxHashMatch`, naming the site and the closest features. The color, font and hero rule stays. Thresholds live in `qa.config.json` and are calibrated on the existing three sites (they must fail against each other on the features we know they share, so the measure is shown to see the problem) and on fixtures.
8. **Pilot:** three niches chosen to pull toward different archetypes; each run uses `new-landing.sh --auto`; all three plus the existing three must pass the new rule pairwise. The niches and their blends are recorded in the change's tasks.

## Risks / Trade-offs

- [Archetypes become a new template] → the blend, the twist from the requirement and the per-site design system keep results apart; the diversity rule checks layout, not just names.
- [Signature measure is noisy] → features are coarse and normalized; thresholds calibrated on known cases; the reviewer still looks at section screenshots.
- [Generation ignores the archetype] → the final check compares the built signature with the primary archetype's `signature` targets and warns when it is far off.
- [Cost of the pilot] → three runs in sequence with `--model sonnet`, logged in RUN.md.
