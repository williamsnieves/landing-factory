# Proposal

## Why

The three landings generated so far (panaderia, clinica-dental, samurai) differ in color and fonts but share one composition: a small uppercase eyebrow, a large heading left with text right, rounded photos, pill buttons, a huge wordmark footer. Causes (see `docs/product-plan.md`): `/new-landing` uses panaderia as its worked example for the proposal, the design system, the tokens and the footer; one starter and one set of build instructions give one layout grammar; and the diversity rule only compares primary color, display font and hero type, so a new color passes with the same layout. A product needs results that look made for each customer.

## What Changes

- **Archetype catalog** in `design-archetypes/`: 8 to 10 composition archetypes, each a short sheet with its layout grammar (grid, section patterns, header, footer, density), typography and imagery treatment, buttons and links, motion signature, the requirement signals it fits and does not fit, and a few "lendable traits" another archetype may borrow. Machine-readable front matter, checked by a validator.
- **Blends steered by the requirement**: a script scores archetypes against the brief signals (brand personality, audience, offer, available assets, tone) and lists candidate blends (one primary, at most one secondary that lends one or two traits), excluding blends already used by other sites. The synthesis phase chooses and records the blend and the reasons in `PROPOSAL.md` and `landing-meta`.
- **No worked-example anchoring**: `/new-landing` and the `new-site` templates stop pointing to panaderia as the model; they point to the chosen archetypes instead.
- **Layout signature**: a script measures the built page (section and grid patterns, image and button radii, button shape, heading scale and alignment, eyebrow use, full-bleed media share, text density, footer type) and a perceptual hash of viewport screenshots; the result is stored per site.
- **Real diversity rule**: `check-landing` compares the new site's layout signature and screenshot hashes with every other site and fails when they are too close, in addition to the existing color, font and hero rule.
- **Validation**: the three-niche pilot. Three landings for different niches generated with `new-landing.sh --auto`, each passing QA and `check-landing`, different from each other and from the existing sites by the new measure.

## Capabilities

### New Capabilities

- `design-archetypes`: a catalog of composition archetypes and requirement-driven blends that steer each landing's layout.

### Modified Capabilities

- `landing-generation`: the proposal records an archetype blend chosen from the requirement; diversity is measured on layout and screenshots, not only color, font and hero type.

## Impact

- New: `design-archetypes/*.md`, `scripts/validate-archetypes.mjs`, `scripts/pick-archetypes.mjs`, `scripts/layout-signature.mjs`, `sites/<slug>/layout-signature.json`, three new sites under `sites/`.
- Changed: `/new-landing` skill, `new-site` templates, `check-landing` diversity rule, docs.
- Existing sites are not regenerated; their signatures are measured and stored so new sites must differ from them.
- Cost: the pilot runs three full generations (about 30 to 70 minutes each).
