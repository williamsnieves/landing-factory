# Tasks

## 1. Fix

- [x] 1.1 Replace `clearProps: 'transform'` with the `onComplete` inline `none` in `src/components/motion/index.ts` and every `sites/*/src/components/motion/index.ts`.

  Verify: `grep -rn clearProps src sites` finds none in the motion layers; `npm run qa` (starter) and `npm run qa -- --site samurai` and `--site panaderia` pass.

## 2. QA check

- [x] 2.1 `measureRevealEndState` in `scripts/qa/browser-checks.mjs`, wired in `scripts/qa.mjs` (failure entry, `revealEndState` page record, `--skip reveal-end-state`).

  Verify: reverting the fix in `sites/panaderia` makes `npm run qa -- --site panaderia --skip lighthouse,impeccable` fail with `reveal-end-state`; restoring it passes.
- [x] 2.2 Fixtures `tests/fixtures/qa/reveal-shifted` and `reveal-settled` and a test in `tests/qa.e2e.test.mjs`.

  Verify: `node --test tests/qa.e2e.test.mjs` passes (shifted fails, settled passes, skip passes).

## 3. Docs

- [x] 3.1 `CLAUDE.md` "QA loop" and "Reading report.json" list the check and the `reveal-end-state` failure.

  Verify: by review; `npx prettier --check .` passes.
