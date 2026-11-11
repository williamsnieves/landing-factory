# Design: add-newsletter

## Plain HTML post, no provider script
Brevo's embed code ships its own stylesheet, a script and optional reCAPTCHA. The factory keeps only the `<form action>` the customer's form posts to and renders its own accessible markup in the site's design: no third-party script, no cookie before the visitor acts, the CSP opens one form origin. Without JavaScript the browser posts and Brevo shows its own confirmation page; that is acceptable for a sign-up and keeps the page static.

## Field names
Brevo's generated HTML uses `EMAIL` for the address, an `OPT_IN` checkbox for consent, a hidden honeypot (`email_address_check`) and `locale`/`html_type` hidden fields, as seen in embed codes; there is no official reference page. The component keeps these names in one place (`fields.ts`) and the first real sign-up with the owner's account confirms them against the generated code before a customer landing ships a newsletter.

## Double opt-in
Configured in Brevo ("Double confirmation" on the form), not by the factory. The page states it ("you will get an email to confirm"), the privacy text names it, and the intake tells the customer to turn it on. In Spain the LSSI and GDPR require prior, specific consent; double opt-in is the evidence of it.

## Host matching
`report.forms.providers` stays a list of hosts; an entry starting with `*.` matches exactly one or more labels before the rest (`*.sibforms.com` matches `abc.sibforms.com`), compared on the parsed URL host, never by substring.
