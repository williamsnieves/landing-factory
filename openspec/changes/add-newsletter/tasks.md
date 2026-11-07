# Tasks: add-newsletter

## 1. Brief
- [ ] 1.1 `newsletter` purpose, `brevo` provider, `action` (format check), the brevo constraints (newsletter only, fields `email`/`name`), never assumed, `missing` and `summary` (host only). Verify: brief tests.
- [ ] 1.2 `/brief-intake` asks about a newsletter and explains how to get the action URL with double confirmation on. Verify: review.

## 2. Component and CSP
- [ ] 2.1 `NewsletterForm.astro` and its `en`/`es` texts in `fields.ts`; renders nothing without an action URL. Verify: markup tests (form action, consent required and unchecked, honeypot, no Brevo script).
- [ ] 2.2 `/forms/` demo shows the newsletter form with a fake action on a fake subdomain; QA passes with no third-party request at load. Verify: `npm run qa`.
- [ ] 2.3 `astro.config.mjs` adds the Brevo origin to `form-action` only when `legal.json` has a Brevo form. Verify: CSP test with and without.

## 3. Legal and report
- [ ] 3.1 `legal.mjs` records the newsletter; privacy texts (`en`, `es`) name Brevo, data, purpose, double opt-in, unsubscribe, retention. Verify: legal tests.
- [ ] 3.2 `report.forms.providers` default adds `*.sibforms.com`; wildcard matching on the parsed host; config validation accepts the `*.` form only as a prefix. Verify: report tests (match, look-alike fails, plain HTTP fails, missing provider name fails).

## 4. Generation and docs
- [ ] 4.1 `new-landing` skill uses `<NewsletterForm />` for a newsletter form. Verify: review.
- [ ] 4.2 `docs/forms.md` Brevo section (setup, double opt-in, first real sign-up still owed), CLAUDE.md, `docs/status.md`.
- [ ] 4.3 `npx prettier --check .`, `npm run lint`, `npm run check`, `npm run check:sites`, `npm run validate:patterns`, `npm run validate:archetypes`, `npm test`, `npm run qa`, `openspec validate --all --strict`.
