# Design: fix-test-run-findings

## Wait for TLS

- The wait lives in the report, not in the YAML: it is testable with a fake fetch, it travels to exported repositories with the report's code, and the YAML stays a one-flag change.
- `--wait-tls <seconds>`: an integer from 1 to 600; another value is exit 2. It is accepted only when live checks run (`--url` or `--site-url`, not `--only static`); otherwise exit 2.
- Loop: request `/` of the URL's origin with the report's own `request()` helper (same proxy, timeout and user agent). Stop when the answer is `ok`. Otherwise sleep 10 seconds and retry until the deadline. Any failure (TLS or unreachable) is retried, since a new hostname can also fail DNS for a short while. Each attempt prints one line to stderr (`[report] waiting for TLS on <host>: attempt N, <error>`), never a body.
- After the loop the live checks run unchanged: the wait never turns a failure into a pass and adds no report item. `report.json` records `waitedTlsMs` in the live run's metadata so a slow certificate is visible.
- Tests inject `sleepFn` and `now` (already in `deps`), so no test waits for real time.
- CI: `--wait-tls 300` on the deployment URL's live step, root `deploy` job and `site-qa-deploy`. On an existing project the first attempt answers and nothing is waited.

## Picker wording

- `deriveSignals` keeps `awarenessAssumed` (true in both cases) and adds `awarenessSource`: `stated`, `assumed` (stated and listed in `assumed`), `default` (missing or invalid) or `no-brief`. `formatResult` writes one note per source: `default` keeps today's text; `assumed` says "audience.awareness is <level> but listed as assumed; confirm it with the customer". The JSON output includes the new field.

## Signup goal

- `SIGNUP` pattern (folded text, whole words): `sign up`, `signup`, `sign-up`, `register`, `registration`, `create (an|your) account`, `free trial`, `start (for )? free`, `try (it )?free`, `get started`, `registro`, `registrate`, `crea tu cuenta`, `crear cuenta`, `prueba gratis`, `empieza gratis`, `empezar gratis`, `comienza gratis`. Order in `goalOf`: booking, signup, buy, lead.
- Fits: `goal:signup` added to `fab`, `aida` and `slap` (a self-serve start is a short decision on the product's features). No framework lists it as a misfit.
- The existing tests for `booking`, `buy` and `lead` keep passing; new cases cover English and Spanish sign-up labels and URLs, and that "Reservar cita" stays `booking`.

## Tagged primary URL

- `factPresent` for a `url` fact: equal after `trimSlash` (today), or both parse as URLs with the same `origin` and the same path after `trimSlash`, and every `searchParams` entry of the brief URL appears with the same value in the `href`. Relative `href`s and non-http schemes never match by the new rule.
- Tests: a UTM-tagged href passes; a different path, host or parameter value fails; a brief URL with `?plan=gratis` matches an href with `?plan=gratis&utm_source=x` but not `?plan=pro`.
