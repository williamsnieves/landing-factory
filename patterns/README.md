# patterns

Abstract pattern sheets extracted from reference sites: structure, rhythm, interaction ideas and motion behavior described in your own words. Never store assets, copy or code from a reference here (see `CLAUDE.md`, "Extract patterns, don't clone").

## How sheets are made

Run the `analyze-reference` skill (`/analyze-reference <url> [--focus "what we like"]`). It checks `robots.txt` and text-and-data-mining reservations first, runs a local reconnaissance script, writes `patterns/<slug>.md` from `_template.md`, validates it and deletes all temporary material. Details: `.claude/skills/analyze-reference/SKILL.md`.

Files here:

- `_template.md`: the sheet template (frontmatter `url`, `slug`, `date`, `focus`, `libraries`, then fixed sections).
- `<slug>.md`: one sheet per analyzed reference.
- `_example-starter-demo.md`: a worked example that describes this repo's own starter demo (no third-party content).

## What is extracted

Allowed, always in your own words:

- Section order and roles, approximate heights, hero type.
- Grid, spacing rhythm and type scale as ratios and classes.
- Typefaces and colors as generic roles ("large grotesque display + serif body", "near-black background, warm saturated accent").
- Density, and a motion inventory: trigger (load, scroll, hover), type (reveal, pin, parallax, scrub, page transition, shader/3D) and the likely library or technique with a confidence level.
- Detected libraries and the evidence class (global, script name, network domain, DOM class).

## What is never extracted

Images, videos, 3D models, logos, illustrations or icons, text (headlines, body, microcopy) beyond the page title and URL, source code (markup, CSS, JS, shaders), brand font names and exact identity colors. Screenshots taken during analysis live in `.cache/analyze/<slug>/` (git-ignored) and are deleted when the analysis ends.

## Validation

`npm run validate:patterns` checks every `patterns/*.md` (except `README.md` and `_template.md`) and CI runs it. It fails, naming `file:line`, on:

- missing frontmatter keys or sections, empty sections, leftover `{{placeholders}}`;
- URLs ending in image, video, font or 3D-model extensions;
- fenced code blocks longer than 3 lines;
- hex colors and `rgb()`/`hsl()`/`oklch()` literals;
- quoted strings longer than 12 words (likely copied text). A line starting with `> note:` is exempt from this one rule, for your own remarks.

The heuristics catch accidents, not intent: a human still reviews every sheet in the PR. This is guidance, not legal advice.
