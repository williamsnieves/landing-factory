## ADDED Requirements

### Requirement: Brief forms section
The brief SHALL accept an optional `forms` array (at most 3) whose entries have an `id`, a `purpose` from a closed list, `fields` from a closed list, a `provider` (`web3forms` or `whatsapp`) and an optional `accessKey`. Unknown keys, purposes, fields or providers SHALL fail validation.

#### Scenario: Valid valuation form
- **WHEN** a brief has `forms: [{ id: "valuation", purpose: "valuation", fields: ["name","phone","address","size"], provider: "web3forms", accessKey: "<uuid>" }]` and a legal market
- **THEN** `brief.mjs validate` exits 0 and `summary` lists the form

#### Scenario: Assumed access key is refused
- **WHEN** `assumed` lists `forms[0].accessKey`
- **THEN** validation fails naming the field

#### Scenario: A form needs a privacy policy
- **WHEN** a brief has a form and no `legal.markets` or `legal.processing.forms` is not `true`
- **THEN** validation fails and says a form requires a legal market and `processing.forms: true`

### Requirement: LeadForm component
`src/components/forms/LeadForm.astro` SHALL render an accessible HTML form with labelled fields from the closed list, a required consent checkbox that links the privacy page, and a honeypot. It SHALL work without JavaScript and, with JavaScript, submit by `fetch` and announce the result in an `aria-live` region.

#### Scenario: Without JavaScript
- **WHEN** a Web3Forms form is submitted with JavaScript disabled
- **THEN** the browser posts the form to the provider endpoint with `access_key`, the fields and the consent

#### Scenario: With JavaScript
- **WHEN** the visitor submits with JavaScript enabled and the provider answers success
- **THEN** the page stays, the button is re-enabled and the status region announces success; on failure it announces the error and keeps the typed values

#### Scenario: Consent is required
- **WHEN** the consent checkbox is not ticked
- **THEN** the form is not sent and the browser shows the required-field message

### Requirement: WhatsApp fallback
A form with provider `whatsapp`, or a `web3forms` form without an `accessKey`, SHALL send nothing to any server and SHALL build a prefilled `wa.me` message from the fields to the brief's WhatsApp number.

#### Scenario: No access key yet
- **WHEN** the brief's form has provider `web3forms` and no `accessKey`
- **THEN** the build renders the WhatsApp fallback and the report warns that the form falls back

### Requirement: Forms layer
`forms` SHALL be an optional site layer, like `3d` and `legal`. `new-site` copies it, `site-layers.mjs prune` removes it when no file outside it imports it, and `add forms` restores it.

#### Scenario: Unused layer pruned
- **WHEN** a site's pages import no form component
- **THEN** `site-layers.mjs check` fails until `prune` removes `src/components/forms/`

### Requirement: Content Security Policy for forms
A site with a Web3Forms form SHALL allow the provider origin in `form-action` and `connect-src` and nothing else. A site without one SHALL gain no new origin.

#### Scenario: Site without forms
- **WHEN** a site has no form
- **THEN** its CSP has no `api.web3forms.com`

### Requirement: Privacy text names the provider
`legal.mjs` SHALL record each form's provider, purpose and fields. The privacy policy SHALL name the provider, what is sent and why, in the page's language (`en`, `es`). Older `legal.json` files with `forms: true` SHALL keep rendering.

#### Scenario: Web3Forms named
- **WHEN** the brief has a Web3Forms valuation form and market `ES`
- **THEN** the built privacy page names Web3Forms, the purpose and the fields in Spanish

### Requirement: Report item legal-forms
The landing report SHALL add a `legal-forms` item. A form with a personal-data field SHALL fail without a required consent checkbox linking a privacy page, when it posts to a host outside `report.forms.providers` or over plain HTTP, when the privacy page does not name the provider, or when a Web3Forms form has no `access_key`.

#### Scenario: Missing consent
- **WHEN** a built page has a form with an email field and no required consent checkbox
- **THEN** `legal-forms` fails with the page and line

#### Scenario: Unknown provider
- **WHEN** a form posts to a host not listed in `report.forms.providers`
- **THEN** `legal-forms` fails naming the host

#### Scenario: No forms
- **WHEN** no built page has a form
- **THEN** `legal-forms` is `na`

### Requirement: Tests never call the provider
Tests and CI SHALL never send a request to Web3Forms. Form submission tests SHALL use a local fake endpoint.

#### Scenario: Fixture submission
- **WHEN** the e2e test submits the fixture form
- **THEN** the local fake receives the expected fields and no request leaves the machine

### Requirement: Generation and revision use forms from the brief
`/new-landing` SHALL place each brief form with `<LeadForm />` and keep WhatsApp as the primary action when a form falls back. `/brief-intake` SHALL ask for forms and never invent an access key. The revise skill SHALL classify a new or changed form as `content` and an access-key change as `fact`.

#### Scenario: Intake without a key
- **WHEN** the customer wants a valuation form but has no Web3Forms key
- **THEN** the brief records the form with an empty `accessKey` and the intake explains how to create one
