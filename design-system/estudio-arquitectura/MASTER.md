# Design system: Estudio Larrea Vidal Arquitectura (estudio-arquitectura)

Design-system phase of `/new-landing` (ui-ux-pro-max only). The approved `PROPOSAL.md` and the archetype blend `swiss-grid-minimal` + `horizontal-chapter-story` win over the skill.

## 1. Skill queries run

1. `search.py "architecture studio sober precise editorial blueprint" --design-system -p "Estudio Larrea Vidal"` -> Minimalism & Swiss Style, hero-centric pattern, grey + orange palette, Inter / Playfair.
2. `search.py "architecture blueprint ink blue paper" --domain color` -> closest rows: Construction/Architecture (slate grey + safety orange), Notes & Writing (warm ink on cream).
3. `search.py "grotesk sans architecture precise" --domain typography` -> Cinzel / Josefin Sans, Space Grotesk rows.
4. `search.py "swiss grid minimal" --domain style` -> `minimalism-and-swiss-style` (12-16 column grid, radius 0, no shadows, one accent).

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Pattern: the skill suggests a Hero-Centric full-bleed hero; the proposal fixes a `split` hero (statement left, drawn plan right). Proposal wins.
- Palette: the skill gives slate grey with safety orange; the proposal asks for deep ink blue on warm paper with graphite ink. Own palette, informed by the skill's "single primary only" rule and its warm cream grounds.
- Typography: the skill suggests Inter / Playfair Display (serif contrast) and Cinzel; the proposal asks for sans display and sans body with small contrast. Schibsted Grotesk + Hanken Grotesk.
- Style background: the skill's pure white and black; the proposal asks for warm paper and graphite. Proposal wins.
- Archetype vs skill: none beyond the above; the Swiss style (radius 0, no shadow, grid) matches the archetype.

## 3. Chosen style

Minimalism & Swiss Style read as a drawing sheet: 12-column grid, thin rules like plan linework, flush-left axis, tabular numerals, one blueprint-blue accent, no shadows or gradients. Radii 0 to 2 px, small type contrast between heading and body, density airy with ruled rows. The horizontal-chapter-story lends numbered chapters (I to VII) and a sideways project track.

## 4. Palette

| Role             | Token                      | Hex       | Use                                               |
| ---------------- | -------------------------- | --------- | ------------------------------------------------- |
| Primary          | `--color-primary`          | `#17356B` | Blueprint ink blue: buttons, links, plan linework |
| Primary contrast | `--color-primary-contrast` | `#FFFFFF` | Text on primary                                   |
| Accent           | `--color-accent`           | `#5F86C4` | Lighter blueprint tint: non-text marks, hover     |
| Ink              | `--color-ink`              | `#16171A` | Graphite text and headings                        |
| Ink soft         | `--color-ink-soft`         | `#4A4C52` | Captions, secondary text                          |
| Paper            | `--color-paper`            | `#F6F3EC` | Page ground (warm paper)                          |
| Surface          | `--color-surface`          | `#EBE6DA` | Quiet panels, plan backgrounds                    |
| Line             | `--color-line`             | `#C9C3B5` | Thin rules and borders (non-text)                 |

Contrast (WCAG, measured by `check-landing`, approximate values): ink on paper about 16:1, ink-soft on paper about 7.6:1, ink-soft on surface about 6.7:1, primary on paper about 10.5:1, primary-contrast on primary about 11.5:1. Accent `#5F86C4` on paper is about 3.4:1: use only for non-text marks, lines and large graphics, never body text. Line is decoration only.

## 5. Typography

- Display: Schibsted Grotesk (`@fontsource-variable/schibsted-grotesk`), weight 500 for headings, sentence case.
- Body: Hanken Grotesk (`@fontsource-variable/hanken-grotesk`), weights 400 and 500.
- Both SIL OFL 1.1, self-hosted; tabular numerals via `font-variant-numeric: tabular-nums`.
- Scale (small contrast): xs 12, sm 14, base 16, lg 19, xl 22, 2xl 28, 3xl clamp 30-40, 4xl clamp 36-56 px. The hero statement uses 4xl at most; headings are only a little larger than the lead.

## 6. Spacing, rhythm, radii

- Base unit 4 px (`--spacing: 0.25rem`); sections separated by 96-160 px of white space and a 1 px `line` rule, not colored bands.
- 12-column grid, a small set of spans reused (5+7, 3+9, 4+8, 6+6).
- Radii: `--radius-sm` 0, `--radius-md` 1 px, `--radius-lg` 2 px, `--radius-pill` 2 px (no pills). Images 0. Buttons 0 to 2 px with a 1 px outline.

## 7. Motion tokens

- Reveal: 700 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, 16-24 px rise, via `data-reveal`.
- Hero plan drawing: CSS stroke-dashoffset, about 2.5 s, once, ease-in-out.
- Hover and color changes: 200 ms ease. Project track: native CSS scroll-snap, no pin, no scrub. Reduced motion: final states only.

## 8. Do / don't for the build step

- Do reuse a small set of column spans, hang everything from one left axis, align captions and numerals to the grid, keep chapter numerals (I to VII) as the index, show each project as photograph plus original SVG plan.
- Do keep one heading weight and one body weight, thin 1 px rules, rectangular photos with captions.
- Don't use large centered headings, pills, rounded photos, shadows, gradients, an eyebrow above every heading, heavy heading/body contrast, or a wordmark footer.
- Don't use the accent for text. Don't present stock photos as the studio's work.

## 9. Landing meta

```landing-meta
primary: #17356b
display-font: Schibsted Grotesk
body-font: Hanken Grotesk
hero: split
archetype: swiss-grid-minimal+horizontal-chapter-story
traits: chapter-index, horizontal-chapter
```
