# Tasks

## 1. Harness

- [x] 1.1 `networkidle` wait (5 s cap, errors swallowed) before the scroll-through in `scripts/qa.mjs`; timeout 8000 ms for the check.

  Verify: `node --test tests/qa.e2e.test.mjs` passes.
- [x] 1.2 Re-scroll in the `measureRevealEndState` poll loop.

  Verify: `reveal-late` passes with the change and fails with the previous `qa.mjs` and `browser-checks.mjs` (`reveal-end-state`, opacity 0).

## 2. Tests

- [x] 2.1 Fixture `tests/fixtures/qa/reveal-late` and a test in `tests/qa.e2e.test.mjs`; `reveal-shifted` still fails with metric `transform`.

  Verify: `npm test` passes.

## 3. Docs and real sites

- [x] 3.1 `CLAUDE.md` QA loop bullet for `reveal-end-state`.

  Verify: `npx prettier --check .` passes.
- [x] 3.2 Real sites still pass.

  Verify: `npm run qa -- --site panaderia --skip lighthouse,impeccable` and the same for `samurai` pass.
