## Why

The casavela test showed that the real-estate niche (and most local services) sells on lead capture: a visitor asks for a free home valuation and the agency calls back. Today a landing can only offer WhatsApp, phone and email links; "backend forms" are out of scope because landings are static. The owner decided (2026-10-30) to send forms through a hosted form service, Web3Forms first, with no backend of our own, and to fall back to a prefilled WhatsApp message when the customer has no form account.

## What Changes

- **Brief.** A new optional `forms` section: one or more forms, each with an `id`, a `purpose` from a closed list (`valuation`, `contact`, `callback`, `quote`), its `fields` from a closed list, the `provider` (`web3forms` or `whatsapp`) and, for Web3Forms, the customer's public `accessKey`. The access key is never listed in `assumed`. `legal.processing.forms` becomes `true` whenever a form collects data. `/brief-intake` asks for it.
- **Starter component.** `src/components/forms/` with `<LeadForm />`: real HTML with labels, a required consent checkbox linking the privacy policy, a honeypot, and progressive enhancement. Without JavaScript it is a plain POST to the provider. With JavaScript it submits by `fetch` and shows the result in place, with an `aria-live` status. A `noindex` thank-you page is available. The `whatsapp` provider builds a prefilled `wa.me` message from the fields and sends nothing anywhere. Texts in `en` and `es`.
- **Optional layer.** `forms` joins the `3d` and `legal` layers in `scripts/site-layers.mjs`: `new-site` copies it, and the build prunes it when unused.
- **Security headers.** A site with a Web3Forms form adds the provider's origin to `form-action` and `connect-src` in its CSP. Nothing else is opened.
- **Legal.** `legal.mjs` records the form provider as a processor, together with the purpose and the fields. The privacy policy names the provider, what is sent and why, in `en` and `es`. A form requires a legal market, so its privacy policy exists.
- **Report.** A new `legal-forms` item: a form that collects personal data **fails** when the consent checkbox, the privacy link, or the provider's mention in the privacy policy is missing. A form posting anywhere other than an allowed provider (`report.forms.providers` in `qa.config.json`) or over plain HTTP also **fails**. The existing `forms` security item stays as it is.
- **Generation.** `/new-landing` places the brief's forms with `<LeadForm />` and keeps WhatsApp as the primary call to action when there is no access key. The revise skill treats a new or changed form field as `content`.
- **Export.** The `forms` layer travels with the site; the access key is public by design and is not a secret.
- **Docs.** `docs/forms.md` and CLAUDE.md "Lead forms".
- **Out of scope:** our own backend or serverless function, storing submissions, CRM integrations, file uploads, a captcha (Web3Forms' hCaptcha is a later option), double opt-in, Formspree and other providers (the provider list is a closed vocabulary that can grow), and analytics on submissions.

## Capabilities

### New Capabilities

- `lead-forms`: the brief's `forms` section, the `<LeadForm />` component and its `forms` layer, the Web3Forms and WhatsApp providers, the CSP additions, the privacy-policy text, the `legal-forms` report item, generation and revision rules.

### Modified Capabilities

None. The `forms` layer, `legal.mjs` and the report gain behavior that is specified in `lead-forms`. Their existing requirements are unchanged.

## Impact

- **Code:**
  - `scripts/lib/brief-schema.mjs`, `scripts/brief.mjs` (`missing`, `summary`);
  - `src/components/forms/`, `src/components/legal/texts.ts`, `scripts/legal.mjs`;
  - `scripts/site-layers.mjs`, `scripts/new-site.mjs`;
  - `scripts/report/` (a new item), `scripts/qa/config.mjs`, `qa.config.json`;
  - `.claude/skills/{new-landing,brief-intake,revise-landing}/SKILL.md`;
  - `knip.json`, the export closure.
- **Network:** tests never call Web3Forms; a local fake server checks the POST shape. The first real submission is a manual check by the owner with his own access key.
- **Existing sites:** unchanged. They have no `forms` in their briefs and no form.
