# landing-revision Specification

## Purpose
Rounds of customer changes on a built landing in the managed model: targeted edits from the customer's feedback, checked and recorded per round, stopped when the request needs a rebuild, and refused once the landing is transferred.

## Requirements

### Requirement: Revision round
`scripts/revise-landing.sh <slug> --feedback <file>` SHALL apply the customer's feedback to a built landing as targeted edits in `sites/<slug>/`, run QA, the static report, the layout signature and `check-landing`, and record the round in `sites/<slug>/revisions.json` with the feedback as given, the files changed, the result and the usage. It MUST NOT commit, push, deploy or sync.

#### Scenario: Copy change
- **WHEN** a round asks to shorten the hero heading of a built landing
- **THEN** only files under `sites/<slug>/` change, QA and `check-landing` pass, and `revisions.json` gains round 1 with result `passed`

#### Scenario: Price change
- **WHEN** the feedback gives a new price for a product
- **THEN** `brief.json` is updated and validated before the page is edited, and the round records `briefChanged: true`

### Requirement: Rebuild requests stop the round
A round whose feedback asks for a different archetype, hero type, layout or page structure SHALL stop before editing with `Result: needs-rebuild` and the reason, and the script SHALL exit 0 naming `--directions` or a new build. A request for a different palette family or font family on the same layout is a `restyle` item, not a `rebuild` item.

#### Scenario: New look requested
- **WHEN** the feedback asks for "a completely different style, darker and more editorial, with the form first"
- **THEN** no file outside `revisions.json` and `REVISION.md` changes and the result is `needs-rebuild`

#### Scenario: Restyle mode does not lift the rebuild stop
- **WHEN** a `--restyle` round's feedback also asks to drop the hero and change the page structure
- **THEN** the round stops before editing with `needs-rebuild`

### Requirement: Revision refusals
`revise-landing.sh` SHALL refuse (exit 1, naming the reason) a missing site, a transferred site, a site with direction pages and no build, and a site without a finished build. An empty feedback file, one over 4000 characters or a missing file SHALL exit 2.

#### Scenario: Transferred site
- **WHEN** `revise-landing.sh` runs on a site whose `EXPORTED.json` has `transferredTo`
- **THEN** it exits 1 saying the landing was transferred and `claude` is not started

### Requirement: Restyle requests stop a normal round
A round without `--restyle` whose feedback contains a `restyle` item (a different palette family or font family) SHALL stop before editing with `Result: needs-restyle` and the reason, record the round with that result, and the script SHALL exit 0 printing the `revise-landing.sh <slug> --restyle --feedback <file>` command.

#### Scenario: New palette in a normal round
- **WHEN** a normal round's feedback says "keep everything, but use our navy and sand colors"
- **THEN** no file outside `revisions.json` and `REVISION.md` changes, the result is `needs-restyle` and the script prints the `--restyle` command

### Requirement: Restyle round
`scripts/revise-landing.sh <slug> --restyle --feedback <file>` SHALL choose a new palette and font pairing with ui-ux-pro-max only and update the palette, typography and `landing-meta` (`primary`, `display-font`, `body-font`) of `design-system/<slug>/MASTER.md` together with `src/styles/tokens.css` and the self-hosted font import. It SHALL keep the archetype, hero type, page map, copy, images and motion.

#### Scenario: Palette change on an approved landing
- **WHEN** a restyle round asks for a navy, sand and cream palette on a built landing
- **THEN** `tokens.css` and the MASTER.md palette and `landing-meta` change together, no section component's structure or copy changes, QA and `check-landing` pass, and the round's result is `passed`

#### Scenario: Font change with a new package
- **WHEN** the restyle picks a display font the site does not have
- **THEN** the site gets the self-hosted font package, the old one is removed when nothing uses it, and lint (unused dependencies) passes

#### Scenario: 3D scene poster
- **WHEN** the restyled site has a `<Scene3D />`
- **THEN** its poster is re-rendered with `render-poster.mjs` and its `assets.json` entry updated

### Requirement: Restyle round checks
A restyle round SHALL apply the round's other non-rebuild items, run the same checks as any round (QA, static report, layout signature, `check-landing`, layer check, lint) and MUST NOT commit, push, deploy or sync.

#### Scenario: Failing contrast after a restyle
- **WHEN** a new palette leaves a standard text token pair under 4.5:1
- **THEN** the round fixes the token or the component and does not finish with `passed` until `check-landing` passes

### Requirement: Restyle record
A restyle round SHALL record `restyle: { from, to }` in its `revisions.json` round, each with `primary` (`#rrggbb`), `displayFont` and `bodyFont` (string or `null`), read from the `landing-meta` before and after. The field SHALL be optional, older records SHALL stay valid, and `directions.json` SHALL NOT change.

#### Scenario: Recorded palette change
- **WHEN** a restyle round passes on casavela
- **THEN** its round has `items` with a `restyle` kind and `restyle.from.primary` and `restyle.to.primary` equal to the `landing-meta` primary before and after

#### Scenario: Older record
- **WHEN** `revisions.json` has rounds without `restyle`
- **THEN** it validates as before
