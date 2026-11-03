# Tasks: fix-test-run-findings

## 1. Wait for TLS

- [x] 1.1 Add `--wait-tls <seconds>` to `scripts/landing-report.mjs` (validation, help text, the wait loop before the live checks, `waitedTlsMs` in the live metadata). Verify: new tests with a fake fetch that fails TLS twice then answers (two sleeps, items pass), one that never answers (the deadline is kept, `live-tls` fails), and bad values exit 2.
- [x] 1.2 Pass `--wait-tls 300` in both live report steps of `.github/workflows/ci.yml` and the deployment-URL step of `scripts/export/templates/ci.yml`. Verify: `npm test` (export template tests) and a YAML parse of both files.

## 2. Picker wording

- [x] 2.1 Add `awarenessSource` to `deriveSignals` and the two notes to `formatResult`. Verify: tests for stated, stated-and-assumed, missing and no brief; `node scripts/pick-copy-framework.mjs --site turnio` prints the assumed note.

## 3. Signup goal

- [x] 3.1 Add the `SIGNUP` pattern and the order booking, signup, buy, lead in `goalOf`; add `goal:signup` to FAB, AIDA and SLAP. Verify: new `goalOf` cases (English, Spanish, label and URL) and the existing cases; `pick-copy-framework --site turnio` prints `goal signup`.
- [x] 3.2 Name the kind in `docs/copy.md`, the `copy-frameworks` skill and CLAUDE.md "Copy". Verify: `npm run format:check`.

## 4. Tagged primary URL

- [x] 4.1 Accept a tagged href for the primary URL fact in `check-landing.mjs` `brief-facts`. Verify: new tests (UTM passes; other path, host or parameter value fails).

## 5. Wrap-up

- [x] 5.1 Update CLAUDE.md "Landing report" and "Customer brief" (`brief-facts`), `docs/status.md`. Verify: `openspec validate fix-test-run-findings --strict`, `npm run format:check`, `npm run lint`, `npm test`.
