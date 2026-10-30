## 1. Facts

- [x] 1.1 Confirm the Web3Forms facts in `design.md` (endpoint, formats, `access_key`, `botcheck`, `redirect` tier, storage, response, CORS) from its documentation once the domains are allowed; update `design.md` and `docs/forms.md`. Verify: each fact cites its documentation page.

## 2. Brief

- [ ] 2.1 `forms` schema in `scripts/lib/brief-schema.mjs` (closed purposes, fields and providers; at most 3; `accessKey` UUID pattern; never assumed; requires a legal market and `processing.forms: true`). Verify: unit tests for valid, unknown key, assumed key, missing market.
- [ ] 2.2 `brief.mjs missing` and `summary` show forms. Verify: unit tests.

## 3. Component and layer

- [ ] 3.1 `src/components/forms/` (`LeadForm.astro`, `client.ts`, `fields.ts` with `en`/`es` labels, `whatsapp.ts`), `noindex` thank-you page template. Verify: `astro check`, lint, a starter demo page `/forms/` (`noindex`).
- [ ] 3.2 `forms` layer in `scripts/site-layers.mjs`, copied by `new-site`, carried by the export closure, entries in `knip.json`. Verify: layer tests (prune, add, check).
- [ ] 3.3 CSP additions for Web3Forms only where a form uses it. Verify: unit test (no form, no origin) and the CSP Chromium test on a fixture.

## 4. Legal and report

- [ ] 4.1 `legal.mjs` writes `processing.forms` as `{ provider, purposes, fields }`; `texts.ts` provider paragraph in `en` and `es`; old `forms: true` still renders. Verify: unit tests and a built fixture.
- [ ] 4.2 `legal-forms` report item and `report.forms.providers` in `qa.config.json` (validated). Verify: fixture tests for pass, missing consent, unknown host, http, missing provider mention, fallback warn, `na`.

## 5. Tests

- [ ] 5.1 E2E: a fixture form posts to a local fake server with and without JavaScript; the fake records the fields; nothing leaves the machine. Verify: `npm test`.

## 6. Skills and docs

- [ ] 6.1 `/brief-intake`, `/new-landing`, `/revise-landing` rules for forms. Verify: review of the diff.
- [ ] 6.2 `docs/forms.md`, CLAUDE.md "Lead forms", scope line updated. Verify: review.

## 7. Proof

- [ ] 7.1 Proof on the starter's `/forms/` demo page and the e2e fixture (a real site needs the holder's real data for its privacy policy, which can never be assumed, so casavela keeps WhatsApp until a real customer exists). Verify: starter QA and static report with `legal-forms` passing.
- [ ] 7.2 Full checks in a clean clone and `openspec validate add-lead-forms --strict`.
