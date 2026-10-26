# Tasks

## 1. Handoff script

- [x] 1.1 `scripts/handoff.mjs check` (design Decision 1): the problems, the public-brief warning, `--json`, and exit codes 0, 1 and 2. Reuse `loadSiteConfig`, `mapBriefTarget` and the layer check; write nothing. Add the npm script `handoff` and allow `Bash(node scripts/handoff.mjs *)` in `.claude/settings.json`.

  Verify with `tests/handoff.test.mjs` on fixture factories:
  - each problem is named;
  - a ready site exits 0;
  - `--visibility public` with a brief warns;
  - bad usage exits 2;
  - no file changes;
  - on the real repository, `check --site tupathdigital` names its default `cloudflare` target without a brief conflict and no missing `site` problem when it has one (record the real output).
- [x] 1.2 `scripts/handoff.mjs plan` (design Decision 1 table).

  Verify, with tests:
  - the Vercel apex and Vercel `www` cases give the right redirect direction;
  - Cloudflare names its two secrets and the custom-domain step;
  - VPS names `DEPLOY_SSH_KEY`;
  - "Fix before handing off" lists the `check` problems;
  - fake secret values set in the environment never appear in the output;
  - the Markdown passes Prettier.

## 2. Domain report in exported repositories

- [x] 2.1 `scripts/report/site-url.mjs` and the `--site-url` option of `landing-report.mjs` (design Decision 3).

  Verify with tests:
  - an absolute canonical URL gives its origin;
  - a relative canonical URL or none exits 2 with the reason;
  - `--site-url` with `--url` is bad usage;
  - the existing report tests still pass.
- [x] 2.2 `scripts/export/templates/ci.yml`: the production-only `Landing report (live, site domain)` step, the summary lines and the final failure step covering both reports.

  Verify:
  - the template test asserts the step, its production condition, its order after the deployment report and the final step;
  - an end-to-end export of `personal-brand` into a scratch folder runs `npm run report -- --only live --site-url` there against an unreachable domain and gets only `not-run` items and exit 0. The session cannot reach the real domain.

## 3. Skill and docs

- [x] 3.1 `.claude/skills/landing-handoff/SKILL.md` (design Decision 2): phases, stop points and hard rules, with the commands of each phase. Also how to refresh an already exported repository's workflow and scripts from a fresh export.

  Verify by review: every lesson in the Context of design.md maps to a phase or a rule.
- [x] 3.2 `docs/handoff.md` (delivery models, checklist, DNS cases, GitHub App limits), a "Handing off a landing" section in `CLAUDE.md`, a link from `docs/export.md`, and `docs/status.md`.

  Verify:
  - `npm run format:check` passes;
  - `npm run lint` passes;
  - the full `npm test` passes;
  - `openspec validate add-landing-handoff --strict` passes.
