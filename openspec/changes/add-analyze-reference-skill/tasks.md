# Tasks

## 1. Template and validator

- [ ] 1.1 Create `patterns/_template.md` with frontmatter and fixed sections, and `patterns/README.md` with the rules on what is and isn't extracted; verify the template passes the validator once filled in with dummy data
- [ ] 1.2 Implement `scripts/validate-pattern.mjs` (structure + forbidden content) with tests on valid and invalid fixtures (image URL, code block, hex, long copy, missing section); verify `npm run validate:patterns` and the tests
- [ ] 1.3 Add `patterns/*.md` validation to the CI workflow; verify an invalid sheet fails the check

## 2. Reconnaissance

- [ ] 2.1 Implement `check-robots.mjs` (robots.txt, meta robots, X-Robots-Tag, TDMRep) with tests on mocked responses; verify a reservation aborts
- [ ] 2.2 Implement `recon.mjs` with Playwright: sections, aggregated styles, globals/libraries, network, canvas/WebGL, scroll screenshots at 375/768/1440 in `.cache/analyze/<slug>/`; verify against the starter's own demo served locally
- [ ] 2.3 Guarantee cleanup of `.cache/analyze/<slug>/` on success and error, and that `.cache/` is in `.gitignore`; verify by forcing an error midway

## 3. Skill

- [ ] 3.1 Write `.claude/skills/analyze-reference/SKILL.md`: inputs, steps (robots → recon → write-up → validation → cleanup), abstraction rules, optional REA use and MIT attribution to the cloner; verify it shows up as `/analyze-reference`
- [ ] 3.2 Run the skill on a public test URL that allows crawling and review the sheet by hand; verify it passes the validator and contains no site content
- [ ] 3.3 Document usage in `CLAUDE.md` and `README.md`; verify the documented example works

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive add-analyze-reference-skill` after merge.
