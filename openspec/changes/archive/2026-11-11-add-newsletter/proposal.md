# Proposal: add-newsletter

## Why

Some landings want to build an audience: a sign-up box for news, offers or a launch list. The forms layer captures leads through Web3Forms (a message to the owner's inbox) or WhatsApp, but neither keeps a subscriber list, sends a confirmation or handles unsubscribes. The owner chose **Brevo** (2026-11-07): a French company with servers in the EU, a free plan of 300 emails a day, double opt-in built into its sign-up forms, and campaigns sent from its own dashboard.

## What Changes

- **Brief.** `forms[]` gets the purpose `newsletter` and the provider `brevo`, with `action`: the `https` URL the customer's own Brevo sign-up form posts to (copied from the form's embed code at Brevo's "Share" step). A `brevo` form requires `purpose: "newsletter"`, `fields` limited to `email` and `name`, and an `action` whose host ends in `.sibforms.com` and whose path starts with `/serve/`. The action URL can never be listed in `assumed` (validation fails, like a Web3Forms access key: it is the customer's own form); `brief missing` asks for it; `summary` shows it masked to its host. A newsletter form still needs `legal.markets` and `legal.processing.forms: true`. Prospect briefs keep `forms` empty. Older briefs stay valid.
- **Component.** `<NewsletterForm />` in `src/components/forms/`: a plain HTML form that works without JavaScript, `method="post"` to the brief's `action`, with the email (and optional name) field, the provider's honeypot field, a required, unchecked consent checkbox linking the site's privacy page, the double opt-in note ("We will send you an email to confirm your subscription") and the field names Brevo's embed code uses. Without the action URL (the customer has no Brevo form yet) the component renders nothing and the build lists it under Decisions. Texts in `en` and `es`. No Brevo script, no reCAPTCHA, nothing loaded from Brevo at page load.
- **CSP.** `astro.config.mjs` adds the exact origin of the action URL (`https://<id>.sibforms.com`) to `form-action` only on a site whose `legal.json` has a Brevo form; the starter and other sites gain nothing.
- **Legal.** `legal.mjs` records the newsletter (provider, purpose, fields) and the privacy policy names Brevo (Sendinblue SAS, France; data stored in the EU), what is sent (email, optional name, the consent and its date), why (sending the newsletter), the double opt-in confirmation, that every email carries an unsubscribe link and that the data is kept until the subscriber unsubscribes. Texts in `en` and `es`. Not legal advice.
- **Report.** `legal-forms` accepts a form whose host ends in `.sibforms.com` when `report.forms.providers` lists `*.sibforms.com` (the default list adds it; a leading `*.` matches any subdomain, nothing else), and still fails without the consent checkbox, over plain HTTP or when the privacy page does not name the provider. The `dark-patterns` rule already fails a pre-checked consent box.
- **Generation and docs.** `/new-landing` renders `<NewsletterForm />` where the brief has a newsletter form (one per page, near the end or in the footer); `/brief-intake` asks whether they want a newsletter and how to get the action URL from Brevo (create the form with "Double confirmation" on, then copy the form's `action` from the HTML embed code). `docs/forms.md` gets a Brevo section; CLAUDE.md "Lead forms" and "Customer brief".

## Capabilities

### Modified Capabilities

- `lead-forms`: the `newsletter` purpose and the `brevo` provider, the component, CSP, legal text and report rule.

## Impact

- Code: `scripts/lib/brief-schema.mjs`, `scripts/brief.mjs`, `src/components/forms/` (new `NewsletterForm.astro`, `fields.ts` texts), `astro.config.mjs` (starter; new sites copy it), `scripts/legal.mjs`, `src/components/legal/texts.ts`, `scripts/report/legal-forms.mjs`, `scripts/report/config.mjs`, `qa.config.json`, the starter's `/forms/` demo (a newsletter form with a fake action URL on a fake `sibforms.com` subdomain, never posted by tests).
- Tests: brief validation, the component's markup (no script from Brevo, consent unchecked and required, honeypot), CSP origin only with a Brevo form, legal text, report host matching (`*.sibforms.com` matches `abc.sibforms.com`, not `sibforms.com.evil.example`).
- Verification still owed after merge: the first real sign-up with the owner's Brevo account (field names checked against the generated embed code, the confirmation email received, the contact in the list), like the first real Web3Forms submission.
- Out of scope: sending campaigns, Brevo's API or keys, contact sync, Brevo's JavaScript, reCAPTCHA, other providers, popups or exit-intent sign-ups.
