## ADDED Requirements

### Requirement: Newsletter sign-up through Brevo
The brief SHALL accept a form with `purpose: "newsletter"`, `provider: "brevo"` and an `action` URL whose host ends in `.sibforms.com` and whose path starts with `/serve/`; the action URL SHALL never be listed in `assumed`. `<NewsletterForm />` SHALL render a form that posts to that URL without JavaScript, with a required unchecked consent checkbox linking the privacy page and a double opt-in note, and SHALL load nothing from Brevo before the visitor submits.

#### Scenario: Action URL on another host
- **WHEN** a brevo form's `action` is `https://example.com/serve/abc`
- **THEN** validation fails naming `forms[0].action`

#### Scenario: Assumed action URL
- **WHEN** `forms[0].action` is listed in `assumed`
- **THEN** validation fails saying the customer's form cannot be assumed

#### Scenario: Page load
- **WHEN** a page with `<NewsletterForm />` loads
- **THEN** no request goes to a Brevo host and the consent checkbox is unchecked

### Requirement: Newsletter in the CSP, privacy policy and report
A site whose legal data has a Brevo form SHALL add only that form's origin to `form-action`; its privacy policy SHALL name Brevo, what is sent, the purpose, the double opt-in and the unsubscribe link. The report's `legal-forms` item SHALL accept the form's host through a `*.sibforms.com` provider entry matched on the parsed host.

#### Scenario: Look-alike host
- **WHEN** a form posts to `https://sibforms.com.evil.example/serve/x`
- **THEN** `legal-forms` fails naming the host
