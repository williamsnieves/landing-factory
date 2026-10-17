# Tasks

## 1. Infrastructure

- [x] 1.1 Add dev dependencies (`playwright`, `lighthouse`, `chrome-launcher`) and `qa.config.json` with default thresholds; verify `npm ci` and that the JSON validates against a simple schema included in the script
- [x] 1.2 Implement build + `astro preview` on a free port + page discovery in `scripts/qa.mjs`; verify it lists the demo page and shuts the server down at the end (also on error)

## 2. Checks

- [x] 2.1 Full-page screenshots at 375/768/1440; verify 3 PNGs are generated per page
- [x] 2.2 Overflow and clipped-text detection with selector and width; verify with a fixture page that forces overflow at 375 px (must fail) and with the demo (must pass)
- [x] 2.3 Reduced-motion check; verify with a fixture that leaves a `[data-reveal]` invisible (must fail)
- [x] 2.4 Lighthouse mobile and desktop with thresholds; verify the demo scores above 90 and that raising the threshold to 101 causes a failure
- [x] 2.5 Integrate `impeccable detect` with severity mapping; verify with a parser test on sample JSON output

## 3. Report and CI

- [x] 3.1 Generate `report.json`, `report.md` and the `qa/latest` symlink; exit code 0/1; verify both cases with the demo and a failing fixture
- [x] 3.2 Add `npm run qa` and document in `CLAUDE.md` how to read the report and the "QA → fix → QA" loop; verify the documented command works as written
- [ ] 3.3 Create `.github/workflows/qa.yml` running QA on PRs and uploading the report; verify on this change's PR that the check appears and the artifact downloads

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive add-qa-pipeline` after merge.
