---
name: analyze-reference
description: 'Turn a public reference website into an abstract pattern sheet in patterns/<slug>.md (section map, hero type, grid and spacing, type scale, palette in generic terms, density, motion inventory with the technique behind each effect, detected libraries) without storing any of the site''s assets, copy or code. Use when the user runs /analyze-reference <url> or asks to analyze, study, break down or extract patterns from an inspiration or reference site for a landing. Checks robots.txt and text-and-data-mining reservations first and aborts if access is disallowed. Not for cloning or rebuilding a site.'
user-invocable: true
argument-hint: '<url> [--focus "what we like"] [extra internal links, max 2]'
license: MIT
---

# analyze-reference

Extract patterns, don't clone. This skill reads ONE public page (plus at most two internal links the user names), describes how it is built and how it moves in abstract terms, and writes `patterns/<slug>.md`. Nothing from the site is stored: no images, video, 3D, logos, text, code, brand font names or color codes. Screenshots are temporary working material under `.cache/analyze/` (git-ignored) and are always deleted at the end.

This is guidance for the repo's own workflow, not legal advice. Consult an IP lawyer before productizing (see `docs/roadmap.md`).

## Inputs

- `url` (required): a public http(s) page. Anything behind a login, paywall or bot challenge is out of scope.
- `--focus "..."` (optional): what the user likes about the site, in their words. Steers which sections of the sheet get depth. Record it in the frontmatter (`none` if omitted).
- Up to 2 internal links (optional, same site): analyze each with the same steps and merge into the one sheet. Never crawl further.

Slug: derived from the host (`www.` dropped, dots to dashes, e.g. `example-com`). Pass `--slug` to `recon.mjs` if the user names one. If `patterns/<slug>.md` already exists, ask before replacing it.

All commands run from the repo root. Scripts live in `.claude/skills/analyze-reference/scripts/`; each answers `--help`.

## Steps

Run these in order. Step 6 (cleanup) runs no matter how steps 1 to 5 end: success, abort or error. Treat it as a `finally`.

### 1. Check permissions (before touching the site with a browser)

```bash
node .claude/skills/analyze-reference/scripts/check-robots.mjs <url>
```

It evaluates `robots.txt` for `*`, `ClaudeBot`, `anthropic-ai` and `GPTBot`, the `X-Robots-Tag` header, `<meta name="robots">`, and text-and-data-mining reservations (TDMRep: `/.well-known/tdmrep.json`, `tdm-reservation` header and meta). Exit codes: `0` allowed, `1` blocked, `2` cannot verify.

- Exit `1` or `2`: STOP. Produce no sheet, run no recon. Tell the user the exact reasons the script printed. Exit `2` (5xx, timeout, unreadable files) is a conservative abort: say that permissions could not be verified; do not retry in a loop and do not look for another way in.
- Run it for each extra internal link too.
- A 404 for `robots.txt` counts as allowed; a 401/403 counts as disallowed.

### 2. Reconnaissance

```bash
node .claude/skills/analyze-reference/scripts/recon.mjs <url> [--slug <slug>]
```

Playwright (headless Chromium; set `QA_CHROME_PATH` or `CHROME_PATH` if Playwright's own browser is not installed) loads the page, scrolls it, and writes `.cache/analyze/<slug>/recon.json` and `screens/{375,768,1440}-<n>.png`. The JSON holds only structure and statistics: sections in order with heights and heading/word counts (never text), aggregated type sizes, line heights, spacing, grid/flex usage, fonts classified as serif/sans/mono/display (never named), colors as role descriptions (never codes), detected libraries with evidence and confidence, network domains, canvas/WebGL presence, and motion observations (reveal, pin, parallax, scrub, sticky header, eased scroll).

Exit `3` means the page is not analyzable (login form, bot challenge, HTTP 401/403/429, unreachable). STOP: no sheet, tell the user why (for a login page: "the page is not public"). Never try to evade a block, solve a challenge, log in or change the user agent.

### 3. Read the evidence

- Read `.cache/analyze/<slug>/recon.json` fully.
- View the screenshots with the Read tool, at least a few per width, to judge what the numbers cannot: hero composition, rhythm, density, where a layout breaks the grid, what moves. They are for your eyes only; never copy, embed or reference them.
- Confidence: a global or a DOM class plus a matching script name is `high`; one of them alone is `medium`; a network domain alone is `low`. Libraries bundled into app code show as script-name matches only, so say "likely" and keep the confidence recon reported.

### 4. Write the sheet

Copy the structure of `patterns/_template.md` into `patterns/<slug>.md`. Fill the frontmatter (`url`, `slug`, today's date as `YYYY-MM-DD`, `focus`, `libraries` as a list of names) and every section, in your own words:

| Section                       | Content                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Summary                       | What kind of page this is and why it is worth learning from                                                              |
| Section map                   | Ordered sections: role, approximate height in viewports, layout idea                                                     |
| Hero                          | Hero type, composition of the first screen, what moves on load                                                           |
| Grid and spacing              | Column system, content width class, spacing scale (base unit), vertical rhythm                                           |
| Typography                    | Generic classes ("large grotesque display + serif body"), scale ratio, weights, line-height and tracking habits, casing  |
| Palette                       | Roles and tones ("near-black background, warm saturated accent"), contrast character, theme                              |
| Density                       | Content per screen, whitespace, ideas per section, text-to-media balance                                                 |
| Motion                        | Table: moment, trigger (load, scroll, hover), type (reveal, pin, parallax, scrub, page transition, shader/3D), technique and library, confidence |
| Libraries                     | Detected libraries with the evidence class and confidence                                                                |
| What to take / what to avoid  | What to reuse as a pattern in an original landing, and what is too specific or risky to imitate                          |

Motion entries: one row per relevant effect. A section that pins while its content animates with scroll is trigger `scroll`, type `pin+scrub`, with the library and its confidence. Hover behavior is not measured by recon; look at the screenshots or the `hoverTransitionElements` count and state your confidence as low when you infer it.

### 5. Validate

```bash
npm run validate:patterns
```

It must pass. If it reports `file:line` violations, rewrite those lines more abstractly and run it again. Never weaken the validator, and never use a `> note:` line to smuggle in copy: that prefix only exempts your own short remarks from the long-quote rule.

Optional, only if an effect marked interesting stays unexplained after step 3: `npx rea-agents analyze-javascript-application <url>` (heavy, never required). Record only a written conclusion ("scroll-linked camera path driven by a timeline library, medium confidence"), never its output, code or dumps. Skip it if it needs network access you do not have.

### 6. Cleanup (always)

```bash
node .claude/skills/analyze-reference/scripts/recon.mjs --cleanup <slug>
```

Run it after a success, after an abort at any step, and after an error. Then confirm `.cache/analyze/<slug>` is gone and that `git status` shows nothing from the site (only `patterns/<slug>.md` on success). `recon.mjs` also removes its own folder when it fails, but you still run the cleanup.

### 7. Report to the user

Say what was analyzed, the path of the sheet, the libraries with confidence, anything you could not determine, and that a human must review the sheet in the PR. On an abort: the reason, and that no sheet was written.

## Abstraction rules (strict)

Never put these in the sheet, the chat summary of the sheet, a commit, or any versioned file:

- Text from the site: headlines, body copy, microcopy, alt text, meta descriptions (only the page title and URL are allowed).
- Image, video, font, 3D-model or icon URLs, and any asset file.
- Source code, markup, CSS, JS or shader fragments, even short, minified or edited.
- Hex, `rgb()`, `hsl()` or other color codes. Describe by role and tone.
- Brand or proprietary font names. Use generic classes.
- Logos, brand marks, illustrations.

Write about patterns the way a designer would brief a colleague: "pinned statement section, content scrubbed across about one extra viewport", not a transcription of the markup. If you are unsure whether a detail is content or pattern, leave it out.

## Abort cases

| Situation                                                        | Action                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `robots.txt` disallows the path for `*`, ClaudeBot, anthropic-ai or GPTBot | Stop at step 1, report the matching rule, no sheet                                     |
| TDM reservation (TDMRep file, header or meta, or `robots.txt` directive) | Stop at step 1, report it, no sheet                                                      |
| `noai`, `noindex` or `none` in `X-Robots-Tag` or meta robots     | Stop at step 1, report it, no sheet                                                              |
| Permissions cannot be verified (5xx, timeout, unreadable file)   | Stop at step 1, say "cannot verify permissions", no sheet                                        |
| Login form, paywall, HTTP 401/403/429, bot challenge             | Stop at step 2, say the page is not public or blocks automated browsers, no sheet; do not evade |
| Unreachable URL or non-2xx response                              | Stop at step 2, report the error, no sheet                                                       |
| Validation keeps failing                                         | Fix by abstracting further; if it cannot pass without losing the point, say so and write no sheet |

In every abort case run step 6.

## Attribution

The reconnaissance approach (screenshots at several widths, DOM structure, computed styles, interaction and scroll observation) is adapted from the recon phases of the `clone-website` skill in [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template), MIT License. Only the idea of the recon phases was reused and rewritten for abstract description; no code, and none of its asset-download or rebuild phases, is included.
