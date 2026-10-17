# Design

## Context

See `proposal.md` — Why. Depends on the static starter (`dist/`). Chromium is available at `/opt/pw-browsers` in the cloud; in CI it is installed with `npx playwright install --with-deps chromium`.

## Goals / Non-Goals

**Goals:**
- One command, one verdict, one report the agent can read to fix issues.
- Local run under 3 min for a one-page landing.

**Non-Goals:**
- Pixel-diff visual regression tests (to be considered later).
- Similarity checks against reference sites (covered by human review and the rules).

## Decisions

1. **Node script (`scripts/qa.mjs`) using Playwright as a library**, not `@playwright/test`: we want our own report and control over the flow, not a test runner. Lighthouse via its Node API reusing the same Chromium (`chrome-launcher` with Playwright's path).
2. **Serve `dist/` with `astro preview`** on a free port; discover pages by reading `dist/**/index.html`.
3. **Overflow**: in the browser, `document.documentElement.scrollWidth > innerWidth`, plus a walk of text elements with `scrollWidth > clientWidth` and `overflow` other than visible; report a unique CSS selector.
4. **Reduced motion**: `page.emulateMedia({ reducedMotion: 'reduce' })`, wait for `load` + 500 ms, check `[data-reveal]` has opacity > 0, no Lenis class on `<html>` and no ScrollTrigger `pin-spacer`.
5. **Lighthouse with mobile and desktop presets**; the worst of the two per category is used. One run per page (not the median of 3) for the MVP, with a `--runs 3` option.
6. **impeccable detect** via `npx impeccable@<pinned> detect --json src/`; severities mapped in `qa.config.json`.
7. **Output**: `qa/<ISO-timestamp>/{report.json,report.md,screens/*.png}`; `qa/latest` as a symlink. `qa/` in `.gitignore`.
8. **CI**: `.github/workflows/qa.yml` on `pull_request`, Node 22, npm cache, uploads `qa/latest` with `actions/upload-artifact`.

## Risks / Trade-offs

- [Lighthouse varies between runs and usually scores lower in CI] → threshold applied to the worst preset; `--runs 3` available; variance documented.
- [False positives for "clipped text" with intentional `text-overflow: ellipsis`] → allow `data-qa-allow-clip` on the element.
- [impeccable may change its JSON format] → pinned version and a tolerant parser with a unit test on sample output.
