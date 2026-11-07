## ADDED Requirements

### Requirement: Layout signature ignores the skip link
`scripts/layout-signature.mjs` SHALL leave out of the button measures (`buttonRadius`, `buttonShape`) a link or button whose box lies entirely outside the page, such as the layout's off-screen skip link, so that a skip link never makes a page with no filled button read as one with a filled button.

#### Scenario: Skip link only
- **WHEN** a page's only element with a filled background is the off-screen skip link and its calls to action are text links
- **THEN** the signature's `buttonShape` is `text`

#### Scenario: Page without a skip link
- **WHEN** a page has no off-screen link
- **THEN** its button measures are the same as before this change
