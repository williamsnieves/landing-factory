# legal-compliance Specification

## Purpose
Makes the legal requirements of publishing a landing visible before it goes live: cookies and trackers against the consent rule, the legal notice and privacy policy a market requires, built from the customer's own data, and price claims to review. It supports compliance and is never presented as legal advice.

## Requirements

### Requirement: Cookies and trackers need consent
The landing report SHALL fail when a page sets a non-essential cookie or loads a known tracker (analytics, advertising pixel, session recording, a video or map embed that sets cookies) and the page has no consent mechanism, and SHALL pass when the page sets no cookie and loads no tracker. Evidence comes from the build and, when newer than the build, from QA's browser record.

#### Scenario: Banner-free landing
- **WHEN** a landing sets no cookie, uses no storage key and loads nothing from a tracker host
- **THEN** the cookies item passes and says no consent banner is needed

#### Scenario: Analytics pixel without consent
- **WHEN** a built page loads a script from a known analytics host and the page has no consent mechanism
- **THEN** the item fails naming the page and the host, and the fix names a cookieless alternative or a consent mechanism

#### Scenario: Privacy-friendly video embed
- **WHEN** a page embeds a video from a privacy-enhanced domain that sets no cookie before playback
- **THEN** the item does not fail for that embed

### Requirement: Third-party assets disclose the visitor's IP
The report SHALL warn when a page loads fonts, styles, scripts or images from a third-party host, since that host receives the visitor's IP address, and the fix SHALL suggest self-hosting or listing the host in the privacy policy.

#### Scenario: Fonts from a CDN
- **WHEN** a page loads a stylesheet from a public font CDN
- **THEN** the item warns naming the host

### Requirement: Legal pages required by the market
When the brief names a market with a rule set, the report SHALL fail if the landing lacks a page the market requires, if any page lacks a link to it, if the page misses holder data the rule requires, or if a page still shows the pending-review marker. Rule sets ship for the EU (privacy policy) and Spain (privacy policy and legal notice with holder name, tax id, address and email).

#### Scenario: Spanish market without a legal notice
- **WHEN** the brief's markets include `ES` and the build has no legal notice page
- **THEN** the item fails and the fix names the generator command

#### Scenario: Pending data
- **WHEN** the legal notice renders the pending-review marker because the brief has no tax id
- **THEN** the item fails naming the missing field

### Requirement: Unknown market is never a pass
The report SHALL warn, never pass, the legal-pages item when the landing has no brief, the brief names no market, or a named market has no rule set, saying the requirements are unknown.

#### Scenario: Demo landing without a brief
- **WHEN** the report runs on a landing with no `brief.json`
- **THEN** the legal-pages item warns that the market and its requirements are unknown

### Requirement: Price claims are flagged for review
The report SHALL warn on discount percentages, struck-through prices and "was / now" price pairs in built pages, naming the page and the text; for an EU market the fix SHALL mention the rule that a reduction refers to the lowest price of the prior 30 days.

#### Scenario: Coupon badge
- **WHEN** a page says "50% off" next to a price and the brief's markets include the EU
- **THEN** the item warns with the page, the text and the 30-day rule

### Requirement: Not legal advice
Every report with a legal area and every generated legal page source SHALL state that the checks and templates support compliance and are not legal advice.

#### Scenario: Report footer
- **WHEN** a report with legal items is written
- **THEN** its Markdown states that the legal checks are not legal advice

### Requirement: Legal data for every locale
With a multi-locale brief the legal data generator SHALL record the default locale and, for each locale, where each page the market requires lives, and the legal components SHALL render in the language of their locale. A locale without legal texts SHALL get the English texts and a warning. A single-language brief SHALL produce the same data as before.

#### Scenario: English and Spanish on the Spanish market
- **WHEN** the brief has languages `en` and `es` and market `ES`
- **THEN** the data lists `/privacy/`, `/legal-notice/`, `/es/privacidad/` and `/es/aviso-legal/`, and the Spanish pages are written in Spanish

#### Scenario: Locale without texts
- **WHEN** a locale is `fr`
- **THEN** its legal pages use the English texts and the generator warns that `fr` has no legal text

#### Scenario: Single-language brief
- **WHEN** the brief has one language
- **THEN** the data has no locale list

### Requirement: Legal pages required in each locale
On a multi-locale landing the report SHALL fail the legal-pages item when a page the market requires is missing in any locale or when a page does not link to the legal page of its own locale.

#### Scenario: Page missing in one locale
- **WHEN** the build has no privacy policy under `/es/`
- **THEN** the legal-pages item fails naming the privacy policy and the locale `es`

#### Scenario: Footer links the other language
- **WHEN** the Spanish home page links only to `/privacy/`
- **THEN** the item fails naming `/es/` and the Spanish page it should link

#### Scenario: All locales complete
- **WHEN** all four pages exist and each locale's pages link their own locale's legal pages
- **THEN** the item passes naming the locales
