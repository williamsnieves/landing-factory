## Context

Landings are static (Astro, `output: 'static'`) and deploy to Cloudflare Pages or Vercel without a server of our own. CLAUDE.md lists backend forms as out of scope. The real-estate test (casavela) showed that lead capture, such as a free valuation request, is what this niche buys. The owner chose a hosted form service, Web3Forms first, with a prefilled WhatsApp message as the fallback (2026-10-30).

Web3Forms facts, from docs.web3forms.com (read 2026-10-30; web3forms.com itself answers a Cloudflare bot challenge to this session and was not bypassed):
- **API reference.** The endpoint is `POST https://api.web3forms.com/submit`. Reserved fields:
  - `access_key` (required);
  - `email` (sets reply-to);
  - `subject`;
  - `replyto`;
  - `redirect` (free; "only recommended when using without JavaScript"; default success page `https://api.web3forms.com/submit/success`);
  - `botcheck` (a hidden checkbox, honeypot);
  - `from_name`, under Customizations.
  
  Responses: 200, 303 redirect, 400, 429 rate limit.
- **FAQ.** The access key is public by design: it can only send email to its owner. Web3Forms does not store submissions; it forwards them. Server logs with personal data are deleted every two months. The servers are in the United States (US-East), and the company is Web3Creative (Kerala, India). Captcha: hCaptcha is free; reCAPTCHA, Turnstile and domain restriction are paid.
- **Troubleshooting.**
  - The API must be called from the browser; server-side calls get 403 unless on a paid plan with an allowlisted IP.
  - With JavaScript, send `FormData` or JSON (never url-encoded by `fetch`, which returns a 301 and a CORS error), and do not use `redirect`.
  - CORS is open to any origin.
  - Some free platform subdomains are blocked by default, so a `*.pages.dev` preview may not deliver. A custom domain works (or contact support), and production forms need the customer's domain.
  - 429 after many submissions from one IP.
- **Not confirmed:** the free plan's monthly limit (the pricing page is behind the challenge).

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
6. **Legal texts.** `legal.mjs` writes `processing.forms` as `{ provider, purposes, fields }` in place of a boolean. Older `legal.json` files with `forms: true` keep rendering the old sentence. `texts.ts` gains a provider paragraph in `en` and `es`. It names Web3Forms (Web3Creative, India) as the processor and its US servers (an international transfer), what is sent (the field labels), the purpose, that submissions are forwarded to the holder's email and not stored by the provider, the provider's log retention (about two months), and the holder's retention ("as long as needed to answer the request"). Not legal advice; the existing review line stays.
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

- The free plan's monthly limit (pricing page unreachable from this session): the owner reads it when creating the first key.
- Whether `*.pages.dev` previews deliver: checked with the owner's first real key; the docs say free subdomains may be blocked.
- casavela does not get a form here: a form needs a privacy policy with the holder's real identity, which can never be assumed. The starter's `noindex` `/forms/` demo page is the proof; the first real customer in the niche gets the first real form.
