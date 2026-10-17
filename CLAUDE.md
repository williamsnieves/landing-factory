# CLAUDE.md

Rules for any agent or person working in this repo. Keep this file current.

## Project

landing-factory turns a niche into an original, near-Awwwards-quality Astro landing page, ready to deploy. Roadmap: `docs/roadmap.md`.

## Language

All documentation, comments, commit messages and pull request descriptions MUST be written in English.

## Stack

- Astro 7, static output (`output: 'static'`), Node 22 (`.nvmrc`)
- Tailwind CSS v4 via `@tailwindcss/vite`; tokens as CSS variables in `src/styles/tokens.css` (`@theme`)
- React islands (`@astrojs/react`), only where interaction is needed
- Motion: GSAP + ScrollTrigger and Lenis, vanilla TypeScript, driven by `data-*` attributes
- Three.js / R3F only when a landing needs 3D (later change)
- TypeScript strict, `astro check`, Prettier (with `prettier-plugin-astro`)
- Deployment target: Cloudflare Pages (per-branch previews, later change)

## Commands

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `npm ci`          | Install exact dependencies                        |
| `npm run dev`     | Dev server with hot reload                        |
| `npm run build`   | Static build into `dist/`                         |
| `npm run preview` | Serve the built `dist/`                           |
| `npm run check`   | `astro check` (types and Astro diagnostics)       |
| `npm run format`  | Format with Prettier (`format:check` to verify)   |
| `npm run qa`      | Not available yet: arrives with `add-qa-pipeline` |

## Folder structure

```text
src/components/sections/   page sections (.astro first, React islands only if interactive)
src/components/motion/     motion layer: initMotion(), <Motion />, README with primitives
src/layouts/               BaseLayout (SEO, skip link, <main id="main">)
src/pages/                 routes
src/styles/                global.css and tokens.css (single source of the theme)
patterns/                  abstract pattern sheets from references (no assets, copy or code)
design-system/             per-niche design decisions, translated into tokens.css
scripts/                   pipeline automation
openspec/                  specs, changes, archive
docs/                      roadmap and project docs
```

## Workflow: OpenSpec

Work is organized with OpenSpec. One change = one branch `change/<name>` = one PR.

```text
/opsx:propose <name>   -> proposal, specs, design, tasks
/opsx:apply <name>     -> implement tasks.md; check a task only after its verification passed
/opsx:archive <name>   -> after merge, merge the change's specs into openspec/specs/
```

Keep changes small and reviewable. Every task states how it is verified. Validate with `openspec validate <name> --strict`.

## Quality budgets

A landing is done only when all of these hold:

- Lighthouse >= 90 in performance, accessibility and SEO
- No horizontal overflow at 375, 768 and 1440 px
- `prefers-reduced-motion` respected: no smooth scroll, pin or parallax; reveal content is visible
- Content is visible and usable without JavaScript
- Original copy and assets; no major findings in impeccable detect

Motion rules: pages are static HTML by default; load GSAP/Lenis only through `<Motion />`; hydrate React only with an explicit `client:*` directive.

## Extract patterns, don't clone

References are for learning patterns, never for copying. From a reference site, keep only an abstract pattern sheet in `patterns/` (structure, rhythm, interaction, motion behavior in your own words).

NEVER extract, download, store, reuse or publish from a reference site:

- images or photographs
- videos
- 3D models
- logos or brand marks
- copy (headlines, body text, microcopy)
- illustrations or icons it created
- literal code (markup, CSS, JS, shaders), even if minified or lightly edited

Landings use original copy and original or properly licensed assets.

## Licensing and credits

Every external image, font, icon or component must have a compatible license (for example CC0, MIT, or an open collection that allows commercial use). Record each one in a `CREDITS.md` at the root of the site's repo: source URL, author, license. No asset without a recorded license.

## Scope discipline

Do not add CMS, i18n, client/commercial licensing features or backend forms: they are out of scope. Do not commit generated output (`dist/`, `.astro/`, `qa/`).
