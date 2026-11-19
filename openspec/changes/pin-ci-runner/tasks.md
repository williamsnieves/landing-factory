# Tasks: pin-ci-runner

- [x] 1.1 Replace `runs-on: ubuntu-latest` with `runs-on: ubuntu-24.04` in `.github/workflows/ci.yml` and `scripts/export/templates/ci.yml`. Verify: `grep -rn "ubuntu-latest" .github scripts` prints nothing.
- [ ] 1.2 The factory CI on this branch installs Chromium and passes. Verify: the PR's checks.
- [ ] 1.3 After merge, sync into williamsnieves/tupathdigital and williamsnieves/personal-brand; their CI installs Chromium and passes. Verify: those PRs' checks.
