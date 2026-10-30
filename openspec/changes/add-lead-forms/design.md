## Context

Landings are static (Astro, `output: 'static'`) and deploy to Cloudflare Pages or Vercel without a server of our own. CLAUDE.md lists backend forms as out of scope. The real-estate test (casavela) showed that lead capture, such as a free valuation request, is what this niche buys. The owner chose a hosted form service, Web3Forms first, with a prefilled WhatsApp message as the fallback (2026-10-30).

Web3Forms facts used here come from memory; the session cannot reach `web3forms.com` yet. Each is checked against the documentation before implementation (task 1):
- **Endpoint:** `POST https://api.web3forms.com/submit`.
- **Formats:** it accepts a plain HTML form POST and JSON by `fetch`, and answers `{ success, message }`.
- **Key:** the `access_key` field holds a key that is public by design: it only sends mail to the address it was created for.
- **Spam:** a `botcheck` honeypot.
- **Optional fields:** `subject`, `from_name`, `replyto`, and `redirect` for submissions without JavaScript (its plan tier is to be confirmed).
- **Storage:** submissions are forwarded by email, not stored, on the free plan.

## Goals / Non-Goals

**Goals:**
- A customer's form arrives in their inbox, with no server of ours and no secret in the repository.
- The form works without JavaScript and is accessible: real labels, errors announced, and target sizes the existing QA and Lighthouse already judge.
- Data protection is visible and checked: consent, the privacy policy naming the provider, the purpose and the fields. The report fails when a part is missing.
- No landing that does not use forms changes.

**Non-Goals:**
- Our own backend, serverless function or email sending.
- Storing submissions, a CRM, file uploads, captcha, double opt-in, analytics on submissions.
- Providers other than Web3Forms and WhatsApp; the list is a closed vocabulary that can grow.

## Decisions

1. **Brief `forms`, a closed vocabulary.** `forms` is an array (at most 3) of `{ id, purpose, fields, provider, accessKey? }`.
   - `purpose` is one of `valuation | contact | callback | quote`.
   - `fields` take ids from a closed list: `name`, `email`, `phone`, `address`, `postcode`, `propertyType`, `size`, `message`, `preferredTime`.
   - Labels and helper texts come from the component's dictionary in `en` and `es`, so no free-text field definitions go into the brief.
   - `provider` is `web3forms` or `whatsapp`. A `web3forms` form without an `accessKey` falls back to `whatsapp` at build time and warns.
   - `accessKey` (a UUID pattern) can never be listed in `assumed`: validation fails, like the legal holder.
   - A form makes `legal.processing.forms` required to be `true`, and a legal market required, so that a privacy policy exists.
   - Alternative rejected: free-form field definitions in the brief. They are harder to validate, translate and check.
2. **One component, progressive enhancement.** `src/components/forms/LeadForm.astro` renders a `<form method="post" action="https://api.web3forms.com/submit">` with:
   - hidden `access_key`, `subject` and `from_name`;
   - a `redirect` to the site's `/gracias/` or `/thanks/` page when that field is free;
   - a hidden `botcheck`;
   - a required consent checkbox whose label links the privacy page through `legalPath()`.
   
   A small module script (`client.ts`, loaded only on pages with a form) intercepts the submit, posts JSON with `fetch`, disables the button while sending, and writes the result to an `aria-live="polite"` region. Errors keep the typed values. The `whatsapp` provider renders the same fields. On submit it builds a `https://wa.me/<number>?text=` message from the brief's WhatsApp goal and opens it. Without JavaScript it is a plain `<a>` to `wa.me` with a short generic text, since nothing can be composed. The inline script rule holds: an Astro-processed module script, no `is:inline`, CSP hashes unchanged.
3. **Thank-you page.** `src/pages/gracias.astro` (or `thanks.astro` for `en`) is `noindex` and out of the sitemap. It only exists when a `web3forms` form exists, so the `redirect` field has somewhere to land.
4. **A `forms` layer.**
   - `scripts/site-layers.mjs` adds `forms` with paths `src/components/forms/`.
   - `new-site` copies it and the build prunes it when unused, like `legal`.
   - The export closure carries it when used.
   - `knip.json` lists the client module.
5. **CSP.** A site with a `web3forms` form adds `https://api.web3forms.com` to `form-action` and `connect-src` in `security.csp` of its `astro.config.mjs`, and to `public/_headers` where those directives live. The starter keeps no `form-action` opening.
   
   A test asserts that a site without a form gains nothing, and the CSP Chromium test covers a fixture with a form posting to a local fake.
6. **Legal texts.** `legal.mjs` writes `processing.forms` as `{ provider, purposes, fields }` in place of a boolean. Older `legal.json` files with `forms: true` keep rendering the old sentence. `texts.ts` gains a provider paragraph in `en` and `es`. It names Web3Forms and its country, what is sent (the field labels), the purpose, that it is forwarded to the holder's email, and the retention ("as long as needed to answer the request"). Not legal advice; the existing review line stays.
7. **Report item `legal-forms`** (area `legal`, stable id). For every `<form>` in `dist/` with a personal-data field (`email`, `tel`, a `name` input, address):
   - **Fail:**
     - there is no required consent checkbox linking a privacy page;
     - the action host is not in `report.forms.providers` (default `["api.web3forms.com"]`) or not on `https`;
     - the privacy page does not mention the provider;
     - a `web3forms` form has no `access_key`.
   - **Warn:** a `whatsapp` fallback replaced a `web3forms` form.
   - **Not applicable:** no forms.
   
   The existing A06 `forms` item is unchanged: it keeps warning on third-party posting, and its fix now points to `legal-forms`.
8. **Tests never call Web3Forms.**
   - A fixture site posts to `http://127.0.0.1:<port>/submit` from a fake server, and the QA and report tests run against it.
   - Brief validation, `legal.mjs` output, the CSP additions, layer prune and add, and the report item get unit tests.
   - The first real submission is a manual step for the owner with his own key, recorded in `docs/status.md`.
9. **Generation and revision.**
   - `/new-landing` places each brief form where the proposal's page map says. A `valuation` form sits next to the hero's call to action or in its own section.
   - The build keeps the WhatsApp call to action as the primary one when the form falls back.
   - `/brief-intake` asks whether the customer wants a form, its purpose, its fields and the access key. The key is never invented: it shows how to create one at web3forms.com and leaves the field empty if the customer has none.
   - Revise classifies adding or changing a form or its fields as `content`, and an access-key change as `fact`.

## Risks / Trade-offs

- **Provider dependency.** Web3Forms could change terms or limits. Mitigation: the provider is a closed vocabulary with one adapter per provider, and the WhatsApp fallback needs nothing.
- **Spam.** A honeypot only stops simple bots. Mitigation: Web3Forms' own filtering, with hCaptcha as a later option. The owner can rotate the key.
- **The public key lets anyone send mail to the customer.** That is how the service works. The key cannot read data or change the recipient. Documented in `docs/forms.md`.
- **No-JavaScript redirect may be a paid feature.** Mitigation: without `redirect` the visitor lands on the provider's own success page, which is acceptable. Task 1 confirms the tier.
- **Legal.** Collecting leads in Spain needs a privacy policy and a clear purpose. The report enforces the pieces we can check; a lawyer reviews before production, as for every legal page.

## Migration Plan

Additive. Existing briefs, sites and `legal.json` files stay valid. To roll back, remove the `forms` layer and the report item; sites without forms are unaffected.

## Open Questions

- Web3Forms facts (task 1) need `web3forms.com` and `docs.web3forms.com` in the session's allowed domains.
- casavela does not get a form here: a form needs a privacy policy with the holder's real identity, which can never be assumed. The starter's `noindex` `/forms/` demo page is the proof; the first real customer in the niche gets the first real form.
