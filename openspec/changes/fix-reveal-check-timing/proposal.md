# Proposal: fix-reveal-check-timing

## Why

The QA check `reveal-end-state` gave a false failure in the exported personal-brand repository's CI (34 failures such as "[data-reveal] #skills-heading ends with opacity 0 after its reveal"), while it passes on a fast machine.

- QA loads a page with `waitUntil: 'load'` and scrolls through it at once. The motion layer imports GSAP and ScrollTrigger dynamically, so on a slow runner `initMotion` finishes after that scroll-through.
- The ScrollTriggers are then created with the page at the top. Every `[data-reveal]` below the first viewport never plays (`once: true`) and stays at opacity 0.
- A real visitor scrolls after init, so the site is fine. The harness is wrong.

## What changes

- `scripts/qa.mjs` waits for network idle (at most 5 s, never fatal) before the scroll-through, and gives the check 8 s instead of 4 s.
- `measureRevealEndState` scrolls through the page again (and back to the top) on each poll round while something is off, so triggers created late still play.
- Fixture `tests/fixtures/qa/reveal-late` (a stand-in motion layer that initialises 2 s after `load`) and an e2e test.
- `CLAUDE.md` QA loop mentions the wait and the re-scroll.

No threshold changes. A really shifted end state still fails.

## Impact

Spec: `quality-gates` (added requirement).
