# Proposal: fix-test-run-findings

## Why

The two end-to-end test runs (casavela, 2026-10-30; turnio, 2026-11-03) and the tupathdigital handoff (2026-10-31) left four small problems in the factory. Each one either costs the owner a manual step or gives the agent a wrong signal:

- **TLS on a new Pages project.** The CI live report runs a few seconds after the first deploy of a new Cloudflare Pages project, before Cloudflare has issued the certificate for the deployment hostname (about two minutes). `live-tls` fails and the owner has to re-run the job by hand. This happened twice (casavela, turnio).
- **Assumed awareness reported as missing.** `pick-copy-framework` says "audience.awareness is not stated" when the brief states it and lists it in `assumed` (turnio). The agent is told to ask for a value it already has.
- **Sign-up goals read as leads.** A free sign-up or trial ("Empieza gratis", `/registro`) is classified as `goal lead`, so the picker scores the frameworks for a contact request (PAS, PASTOR, QUEST) instead of a self-serve start (turnio).
- **Tagged links fail `brief-facts`.** `check-landing` compares the brief's primary call-to-action URL with an exact `href`, so a landing that tags its links with UTM parameters must keep one untagged copy of the link to pass (tupathdigital's footer "Etsy shop").

## What Changes

- **Wait for TLS before the live checks.** `landing-report.mjs` gets `--wait-tls <seconds>` (live runs only, at most 600). Before the live checks it requests the home page every 10 seconds until it answers over HTTPS or the time runs out, printing each attempt. The checks then run as before, so a certificate that never arrives still fails `live-tls`. The factory CI passes `--wait-tls 300` to both live report steps (root and per site), and the exported workflow template passes it to the deployment-URL step (not to the production-domain step, which already reports an unreachable domain as `not-run`).
- **Picker wording.** When `audience.awareness` holds a valid level and is listed in `assumed`, the picker note says the level is stated but assumed and should be confirmed with the customer; "not stated" stays for a brief without the field.
- **A `signup` goal kind.** `goalOf` returns `signup` when the primary call to action is a free sign-up, account creation or trial (English and Spanish words, label or URL), checked after `booking` and before `buy`. FAB, AIDA and SLAP list `goal:signup` among their fits. Docs and the `copy-frameworks` skill name the new kind.
- **Tagged primary URL accepted.** `brief-facts` accepts an `href` with the same origin and path as the brief's primary URL when every query parameter of the brief URL is present with the same value; extra parameters (UTM) and a fragment are allowed. A different path, host or parameter value still fails.

## Capabilities

### Modified Capabilities

- `landing-report`: a bounded wait for the deployment's certificate before the live checks.
- `copywriting`: the assumed-awareness wording and the `signup` goal kind.
- `landing-generation`: `brief-facts` accepts a tagged primary call-to-action URL.

## Impact

- Code: `scripts/landing-report.mjs`, `scripts/report/live.mjs` (or a small new helper in `scripts/report/`), `scripts/lib/copy-frameworks.mjs`, `scripts/pick-copy-framework.mjs`, `scripts/check-landing.mjs`.
- CI: `.github/workflows/ci.yml` (two live report steps), `scripts/export/templates/ci.yml` (one step).
- Docs: CLAUDE.md ("Landing report", "Copy"), `docs/copy.md`, the `copy-frameworks` skill, `docs/status.md`.
- Tests: `tests/landing-report*.test.mjs` (fake fetch, no network), `tests/copy-frameworks.test.mjs`, the `check-landing` brief-facts tests, the export template test if one asserts the workflow text.
- No site changes; existing landings are not rebuilt. tupathdigital (exported) keeps its untagged footer link until its next revision round.
