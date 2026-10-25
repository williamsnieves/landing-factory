# Tasks

## 1. Default 404 page

- [x] 1.1 `scripts/new-site.mjs`: `notFoundPage({ title, lang })` and `src/pages/404.astro` in the scaffold (design Decision 1); help text updated. Verify:
  - `tests/new-site.test.mjs`: the file list includes `src/pages/404.astro`; the page is `noindex`, uses the language (`en`, `es`, English text for other tags), links `/` and escapes the title; the hardened-site build test checks `dist/404.html` (noindex, `lang`, link home); the Prettier test covers the file. (verified: all pass in `node --test tests/new-site.test.mjs`)
  - End to end with a temporary site: `npm run new-site -- tmp-check-404`, `npm run build -w site-tmp-check-404`, `npm run report -- --site tmp-check-404 --only static` shows "The build has a 404 page" passing; then remove the site and restore `package-lock.json`. (verified: A10 item `The build has a 404 page` passed with `dist/404.html`; temp site, `node_modules` link and lockfile change removed, `git status` shows no trace)
- [x] 1.2 `.claude/skills/new-landing/SKILL.md`: a "404 page" part in the build phase and a 404 look in the review step; `scripts/section-shots.mjs --include-404` (off by default). Verify: `tests/section-shots.test.mjs` (404 skipped by default, captured with the flag) and `tests/ai-images.test.mjs` skill test (the skill names the 404 rules and the flag). (verified: both pass)

## 2. Owner portrait consent in the brief

- [x] 2.1 `scripts/lib/brief-schema.mjs`: `brand.ownerPortrait`, `business.personalBrand`, `ownerPortraitConsent`, the assumed refusal, `missing` (only for a personal brand, after `brand.aiImages`) and `summary` (design Decision 2). Verify: `tests/brief.test.mjs`: values and a bad value, a non-boolean flag, assumed refused (also when empty), `missing` order and condition, summary, `ownerPortraitConsent` cases (no brief, no name, each missing consent, assumed parent), an older brief stays valid, every `sites/*/brief.json` still validates. (verified: tests pass; `node scripts/brief.mjs validate --site tupathdigital` exits 0)
- [x] 2.2 `.claude/skills/brief-intake/SKILL.md`: "The owner portrait question". Verify: the skill test in `tests/brief.test.mjs` asserts the question, `business.personalBrand`, the never-assume rule and the "do not ask" rule. (verified)

## 3. Import, policy, final check and credits

- [x] 3.1 `scripts/lib/ai-prompt-policy.mjs` (`subject` option, `OWNER_EXEMPT_RULES`) and `scripts/ai-images.mjs` (`import --subject owner`, `generate` refuses `--subject`; design Decision 3). Verify: `tests/ai-prompt-policy.test.mjs` (only `people` and `real-person` skipped; brand, identity, results kept) and `tests/ai-images.test.mjs`: accepted with both consents and `subject: "owner"` recorded, refused with no brief / empty / not-allowed / AI images not allowed / assumed (nothing written), `generate --subject` exits 2 with no request, `--subject team` exits 2, brand-name, logo and results prompts refused with the subject. All with fake keys and the local fake server. (verified)
- [x] 3.2 `scripts/check-landing.mjs` `ai-provenance` and `scripts/credits.mjs` (design Decision 4). Verify: `tests/check-landing.test.mjs`: owner portrait passes with both consents; fails with an empty or not-allowed portrait consent and with no brief; a `team` subject fails; the people exemption needs the subject; brand and disclosure rules still apply. `tests/credits.test.mjs`: the Notes text and no footer credit line. (verified)

## 4. Generation skill

- [x] 4.1 `.claude/skills/new-landing/SKILL.md`: owner portrait rules in the AI images part (design Decision 5). Verify: the skill test in `tests/ai-images.test.mjs` asserts the personal-brand condition, both consents, `--subject owner`, the alt text and the disclosure. (verified)

## 5. Docs and specs

- [x] 5.1 Docs: `CLAUDE.md` ("Sites" create bullet, "Customer brief", "AI images", "Generating a landing"), `docs/legal.md`, `docs/status.md`, `docs/agent-interface.md`, `scripts/README.md`, `sites/README.md`; the MCP `brief_update` description. Verify: `npx prettier --check .` and `openspec validate add-personal-brand-support --strict`. (verified: both exit 0)

## 6. Full run

- [x] 6.1 In the working tree: `npx prettier --check .`, `npm test`, `npm run check`, `npm run check:sites` (existing sites unchanged), `openspec validate --all --strict`. (verified: see the report of the implementing session)
- [x] 6.2 Full pre-push run in a clean clone (main session): `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `openspec validate --all --strict`.

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-personal-brand-support --yes` as the first commit of the next branch (the owner's personal-brand landing).
