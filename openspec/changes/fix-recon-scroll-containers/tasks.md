# Tasks

## 1. Scroll containers

- [x] 1.1 Add a fixture page in `tests/fixtures/analyze/` whose document is one viewport tall and whose full-height wrapper scrolls (with a reveal and a pinned/sticky element inside); verify the current recon takes only one screenshot per width on it (reproduces the bug)
- [x] 1.2 Implement scroller detection and the `scrollToY`/`getScrollY` abstraction in `recon.mjs`, used by screenshots, motion sampling and the wheel probe; verify on the fixture that screenshots cover the full wrapper height and motion observations are recorded
- [x] 1.3 Record `scroller` in `recon.json` and report the used scrollable height; verify with a test on both the new fixture (`container`) and the existing fixture/demo (`document`)

## 2. Proxy

- [x] 2.1 Make `check-robots.mjs` and `recon.mjs` route through `HTTPS_PROXY`/`HTTP_PROXY` without manual flags (Node fetch and Chromium), keeping behavior unchanged when no proxy is set; verify with a test using a local forwarding proxy, and by running `check-robots.mjs` on a reachable public site in a cloud session without `NODE_USE_ENV_PROXY`
- [x] 2.2 Document the scroll-container handling and proxy behavior in SKILL.md and CLAUDE.md; verify the sections exist

## 3. Integration

- [x] 3.1 Run `npm ci && npm run check && npx prettier --check . && npm run validate:patterns && npm test && npm run qa` and verify all pass
