# Design system: <Brand> (<slug>)

Neutral skeleton for `design-system/<slug>/MASTER.md`, written by the design-system phase of `/new-landing` (ui-ux-pro-max only). Keep these headings. Copy this file, replace every `<...>`, delete this paragraph. The archetype sheets named in `PROPOSAL.md` ("Archetype blend") constrain the radii, type contrast and density below; the approved proposal wins over everything else.

## 1. Skill queries run

The ui-ux-pro-max queries (`--design-system`, `--domain color`, `--domain typography`, `--domain style`) with the direction keywords used.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

One line per conflict and how it was resolved (the proposal wins). Also list where the archetype sheets and the skill disagree.

## 3. Chosen style

Style name and a short description in words, plus the archetype constraints it respects (radius family, type contrast, density).

## 4. Palette

| Role | Token | Hex | Use |
| ---- | ----- | --- | --- |

Every color as `#RRGGBB`. Then the measured WCAG contrast of each text pair used (text >= 4.5, large text and non-text >= 3).

## 5. Typography

Open-licensed families available as `@fontsource-variable/<name>` or `@fontsource/<name>`; display and body roles; the type scale (contrast between heading and body follows the primary archetype).

## 6. Spacing, rhythm, radii

Spacing scale, section rhythm, and the radius tokens (image, button, card) the primary archetype allows (a brutalist or Swiss grid means 0 to 2 px; a collage or local-service page may round).

## 7. Motion tokens

Durations and easings, and which motion primitives the archetype's motion signature uses.

## 8. Do / don't for the build step

Concrete rules for the build, including the archetype's "Don't" list.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check, diversity rules, archetype-target warning). Keep it in sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #rrggbb
display-font: Family
body-font: Family
hero: full-bleed-photo
archetype: primary-archetype+secondary-archetype
traits: lent-trait-a, lent-trait-b
```

`archetype` is `<primary>`, `<primary>+<secondary>` or `custom` (reference-led); `traits` lists the lent traits, and `ref:<sheet>/<trait>` for a trait taken from a reference sheet.
