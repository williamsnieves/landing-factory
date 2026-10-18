# Proposal

## Why

The first manual run (bakery niche) showed two gaps in `/analyze-reference`:

1. Sites that scroll inside an inner container instead of the document (the document stays one viewport tall while a wrapper element scrolls) are only analyzed on their first screen: one screenshot per width, no motion observations. One of the three bakery references behaves this way.
2. In cloud sessions, outbound traffic goes through a proxy. Node's `fetch` ignores it by default, so `check-robots.mjs` fails with "cannot verify permissions" even when the site is reachable. It works only after setting `NODE_USE_ENV_PROXY=1` by hand.

## What Changes

- `recon.mjs` detects the main scroll container when the document itself does not scroll, and uses it for screenshots, motion sampling and the smooth-scroll probe.
- `recon.json` records which scroller was used (document or inner container) and the scrollable height.
- `check-robots.mjs` and `recon.mjs` honor `HTTPS_PROXY`/`HTTP_PROXY` (and the proxy CA bundle) without manual flags.
- SKILL.md and CLAUDE.md document both behaviors.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
<!-- None at requirement level: these are additions to `reference-analysis`, recorded as ADDED requirements. -->
- `reference-analysis`: adds requirements for inner scroll containers and proxied networks.

## Impact

- Code: `.claude/skills/analyze-reference/scripts/recon.mjs`, `check-robots.mjs`, their tests and fixtures.
- Docs: `.claude/skills/analyze-reference/SKILL.md`, `CLAUDE.md`.
- No new dependencies.
