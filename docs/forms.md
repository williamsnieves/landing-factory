# Lead forms

A landing is static, so the factory has no server to receive a form. Lead forms go through a hosted form service, **Web3Forms** (the first provider), or, as a fallback that needs no account, through a **prefilled WhatsApp message**. This guide covers the brief, the component, the checks and the manual steps. Design: `openspec/changes/add-lead-forms/design.md`.

**The forms, the privacy text and the checks support compliance and are not legal advice.** A lawyer must review the privacy policy before a landing that collects leads goes live in production.

## How it works

1. The customer's brief has a `forms` section (up to 3 forms). Each form has an `id`, a `purpose` (`valuation`, `contact`, `callback`, `quote`), `fields` from a closed list (`name`, `email`, `phone`, `address`, `postcode`, `propertyType`, `size`, `message`, `preferredTime`), a `provider` (`web3forms` or `whatsapp`) and, for Web3Forms, the customer's public `accessKey`. A form requires `legal.markets` and `legal.processing.forms: true`, so a privacy policy exists. Labels and texts are the component's (`en` and `es`), never free text in the brief.
2. `node scripts/legal.mjs --site <slug> --write` records each form's provider, purposes and fields in `src/data/legal.json`. The privacy policy then names the provider, what is sent, why, the international transfer and the retention.
3. `src/components/forms/LeadForm.astro` renders the form. `src/data/forms.ts` holds the brief's forms as a typed module; the page passes one entry per `<LeadForm />`.
4. `astro.config.mjs` reads `legal.json`: only a site whose forms use Web3Forms adds `https://api.web3forms.com` to `form-action` and `connect-src` of its Content-Security-Policy (the `<meta>` tag Astro writes; `public/_headers` carries no CSP beyond `frame-ancestors`, so it does not change). Those two directives also restrict forms to `'self'` and the provider. A site without such a form, and the starter, gains nothing.
5. The report's `legal-forms` item checks the build (see below).

## The component

`<LeadForm form={...} legal={legal} businessName="..." whatsapp="..." thanksHref="/thanks/" />`

- **Web3Forms.** A real `<form method="post" action="https://api.web3forms.com/submit">` with hidden `access_key`, `subject`, `from_name` and (when the site URL is known) an absolute `redirect` to the thank-you page, a hidden `botcheck` honeypot, labelled fields with the right `type`, `autocomplete` and `inputmode`, a required consent checkbox whose label links the privacy page, and an `aria-live="polite"` status. It works without JavaScript: the browser posts the form and lands on the thank-you page.
- **With JavaScript.** `client.ts` (an Astro-processed module script, so the CSP hash approach is unchanged; loaded only on pages with a form) intercepts the submit, posts `FormData` with `fetch` (never url-encoded: Web3Forms answers a 301 and a CORS error) without `redirect`, disables the button while sending, announces success or the error in the status region, keeps the typed values on error and shows a separate message on 429.
- **WhatsApp.** A form with provider `whatsapp`, or a `web3forms` form without an `accessKey`, sends nothing to any server. With JavaScript it composes `https://wa.me/<digits>?text=<greeting and "Label: value" lines>` from the fields and opens it; without JavaScript the form is hidden and a plain link to `wa.me` with a generic text is shown. The number comes from the `whatsapp` prop (a phone number or a wa.me link). The build fails when a WhatsApp form has no number.
- **Thank-you page.** `ThankYou.astro` is the content of `src/pages/thanks.astro` / `gracias.astro` (`noindex`, outside the sitemap). Only a landing with a Web3Forms form has one. The `redirect` field is emitted only when `site` is set in `astro.config.mjs` (it needs an absolute URL); without it the visitor sees Web3Forms' own success page.
- **Starter demo.** `/forms/` (`noindex`) shows one Web3Forms form and one WhatsApp form, with `/forms/thanks/` and a fixture privacy policy at `/forms/privacy/`. The access key there is a fake constant (`src/pages/forms/_demo.ts`, all zeros) and the holder is a made-up company; delete the folder in a real landing.
- **Layer.** `forms` is an optional layer like `3d` and `legal` (`scripts/site-layers.mjs`): `new-site` copies `src/components/forms/` into every site, the build prunes it when no page imports it, `add forms --site <slug>` restores it. A used forms layer keeps the legal components, because the consent box links the privacy page.

## How to get an access key (the customer or the owner does this)

1. Go to web3forms.com and create a free access key with the email address that must receive the leads.
2. Put the key in the brief (`forms[].accessKey`) through `/brief-intake` or `brief_update`. Never invent one and never list it in `assumed` (validation fails).
3. Rebuild. Without a key the form falls back to WhatsApp and the report warns until the key is added.

## Facts about Web3Forms (docs.web3forms.com, read 2026-10-30)

- **The key is public by design.** It can only send email to its owner's address; it cannot read data or change the recipient. It is not a secret and is committed in the brief and the page. If it is abused, the owner rotates it in the Web3Forms dashboard.
- **Not stored.** Web3Forms forwards submissions and does not store them; server logs with personal data are deleted about every two months. The servers are in the United States (US-East) and the company is Web3Creative (Kerala, India): the privacy policy says it is an international transfer.
- **Browser only.** The API must be called from the browser; server-side calls get 403 on the free plan. CORS is open to any origin.
- **`*.pages.dev` previews may not deliver.** Some free platform subdomains are blocked by default. A custom domain works, or Web3Forms support can be asked. Production forms need the customer's domain, and the first real submission is a manual check with the owner's own key (see `docs/status.md`).
- **Spam.** The honeypot (`botcheck`) stops simple bots. hCaptcha is free in Web3Forms and is a later option (out of scope here); reCAPTCHA, Turnstile and domain restriction are paid.
- **429.** After many submissions from one IP the service answers 429; the form tells the visitor to wait.
- **Not confirmed:** the free plan's monthly submission limit (the pricing page answers a bot challenge to this tooling and is never bypassed). The owner reads it when creating the first key.

## The `legal-forms` report item

Run `npm run qa -- --site <slug>` and `npm run report -- --site <slug>`. `legal-forms` (area `legal`) looks at every `<form>` of the build that collects personal data (an email or phone input, or a name, address or postcode control):

| Outcome | When                                                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fail    | no required consent checkbox (the honeypot does not count); the consent label links no privacy page of the site; the form posts to a host outside `report.forms.providers` or over plain HTTP; the privacy page does not name the provider (Web3Forms, WhatsApp); a Web3Forms form has no `access_key` |
| warn    | a WhatsApp fallback replaced a Web3Forms form (no access key yet)                                                                                                                                                                                                                     |
| na      | no forms, or no form collects personal data                                                                                                                                                                                                                                           |
| pass    | every such form has consent, an allowed https provider and a policy that names it                                                                                                                                                                                                     |

`report.forms.providers` in `qa.config.json` (default `["api.web3forms.com"]`, validated) lists the hosts a form may post to; never add a host to get a pass. The A06 `forms` item still warns about any form posting to a third party and points here.

## Tests

Tests and CI never call Web3Forms. `tests/forms-site.test.mjs` scaffolds a Spanish site, builds it with a local fake endpoint (`FORMS_TEST_ENDPOINT`, read by the fixture page) and drives it in Chromium with and without JavaScript; the CSP part intercepts `api.web3forms.com` in the browser. Unit tests: `forms-brief`, `forms-layer`, `forms-csp`, `forms-legal`, `landing-report-forms`.

## Out of scope

Our own backend or serverless function, storing submissions, a CRM, file uploads, a captcha, double opt-in, analytics on submissions, and providers other than Web3Forms and WhatsApp (the provider list is a closed vocabulary that can grow).
