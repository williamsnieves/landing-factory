# Legal checks and legal pages

This guide explains the `legal` area of the landing report and the legal pages that `scripts/legal.mjs` builds from the brief.

**These checks and templates support compliance and are not legal advice.** They do not certify that a landing complies with any law. A lawyer must review the legal pages, and the claims on the page, before the factory sells a landing or a customer publishes it in production.

## What each check means

Run `npm run qa -- --site <slug>` and then `npm run report -- --site <slug>`. The Markdown report has a Legal section with four items.

| Item                 | What it looks at                                                                                | Fail                                                                           | Warn                                                                                                | Pass                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `legal-cookies`      | Trackers in the build, and the cookies, storage keys and hosts QA saw on a real load            | A known tracker loads unconditionally, or a non-essential cookie or key is set | A consent-gated tracker (check the mechanism), or a cookie or key nobody classified                 | No cookie, no storage key, no tracker: no banner needed   |
| `legal-third-party`  | Fonts, styles, scripts, images and frames from other hosts                                      | never                                                                          | A third-party host receives the visitor's IP address                                                | Nothing is loaded from another host                       |
| `legal-pages`        | The legal notice and privacy policy the brief's market requires                                 | A page, a footer link, holder data or a pending marker is missing              | No brief, no market, or a market without a rule set: the requirements are unknown                   | Everything the market requires is present and linked      |
| `legal-price-claims` | Discount percentages, struck-through prices, "was / now" prices (English and Spanish)           | never                                                                          | Each claim, with the page and the text; for an EU market the fix names the 30-day lowest-price rule | No claim found                                            |

A check that cannot run is `not run`, never a pass. The runtime part of `legal-cookies` needs a QA run newer than the build.

## How to stay banner-free

A landing that sets no cookie, writes no `localStorage` or `sessionStorage` key and loads nothing from a tracker needs no consent banner. To keep it that way:

- Use cookieless analytics (Plausible, Cloudflare Web Analytics) or none.
- Self-host fonts and scripts. A font CDN sets no cookie but sends the visitor's IP address to a third party (`legal-third-party` warns).
- Embed video with `youtube-nocookie.com`, or add `dnt=1` to a Vimeo player URL. Maps and other embeds that set cookies need consent.
- If a tracker or embed is needed, make it inert until consent: `<script type="text/plain" data-consent="analytics" src="...">` or an embed placeholder with `data-consent-src="..."`. The report then warns "verify the consent mechanism". A consent banner component is not part of the factory yet; it arrives with the first change that adds analytics or embeds. Until then such a page fails the report.
- A cookie your hosting sets and that is strictly necessary can be listed in `qa.config.json` under `legal.essentialCookies` (`__cf_bm` and `cf_clearance` are listed already). A storage key goes in `legal.essentialStorageKeys`. Never list a tracker to get a pass.

## Legal pages from the brief

1. In `brief.json`, fill `legal.markets` (`EU` or country codes such as `ES`), `legal.holder` (`name`, `taxId`, `address`, `email`, and `register` for a company), `legal.privacyContact` and `legal.processing` (`analytics`: `none`, `cookieless` or `cookies`; `forms`; `embeds`). `/brief-intake` asks for them. Holder identity is never assumed or invented.
2. `node scripts/legal.mjs --site <slug> --write` writes `sites/<slug>/src/data/legal.json`. It lists the required values the brief does not have under `pending`. `--check` exits 1 when the file is stale.
3. The site renders the pages with the components copied by `new-site` (`LegalNotice`, `PrivacyPolicy`, texts in English and Spanish) and links them from every page footer. `/new-landing` does this when the brief names a market.
4. A required value that is missing renders a visible "pending legal review" marker, and the report fails until the customer gives it.

| Market                                    | Pages required                | Holder data required                                                |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `EU` and every EU member state            | Privacy policy                | Name, and an email (the holder's or the privacy contact)            |
| `ES` (LSSI-CE)                            | Privacy policy, legal notice  | Name, tax id, address, email; register entry only warns             |
| Any other market                          | None known                    | The report warns "no rule set": the requirements are unknown        |

## What this does not cover

Terms of sale, accessibility statements, markets without a rule set, the wording of cookie consent, and whether a price claim is lawful. The report names what it cannot judge; a person decides.
