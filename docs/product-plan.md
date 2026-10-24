# Product plan

Agreed with the owner on 2026-10-21, after the MVP (three landings: panaderia, clinica-dental, samurai). Each step is one OpenSpec change and one PR, in this order. The plan is refined as we go; the first real customer test is the owner's own landing for their digital products.

## Why

The MVP works end to end, but the three landings look alike, the only input is a one-line niche, quality stops at lab metrics, deployment only targets Cloudflare Pages, and everything lives in one monorepo. A product needs original results, a real intake, a quality and security report, deploy targets the customer chooses, and an interface any agent can drive.

### Why the three landings look alike

- `/new-landing` uses panaderia as its worked example for the proposal and the design system, so later sites inherit its composition (the dental clinic even copied the huge footer wordmark).
- One starter and one set of build instructions give one layout grammar: small uppercase eyebrow, large heading left and text right, rounded photos, pill buttons.
- The diversity rule only compares primary color, display font and hero type; a new color passes it with the same composition.
- Thin references: none for the clinic, one screen per reference for the samurai.

## Steps

1. **Design archetypes (`add-design-archetypes`).** A catalog of 8 to 10 composition archetypes (for example editorial magazine, Swiss minimal, brutalist, horizontal scroll story, collage, immersive 3D, product showcase, typographic poster). Each landing blends a primary archetype with at most one secondary, steered by the requirement (brand personality, audience, offer, assets) rather than picked at random, and avoids blends already used in `sites/`. The worked-example anchoring on panaderia is removed. Diversity is measured on a layout signature taken from the built DOM (grid patterns, radii, density, button and heading treatment) and on screenshot similarity, plus type families, not single fonts. Validated by the three-niche pilot.
2. **Requirement intake (`add-brief-intake`).** A validated `brief.json` (business and offer, audience, goal and call to action, tone, real data such as address, hours and prices, the customer's own assets and their links, references liked and disliked, language, legal constraints, deploy target and domain). Filled by an agent-led interview that asks only for what is missing, or by a form. Unknown fields are marked as assumed, never invented. The proposal, archetype blend and copy read from it.
3. **Quality and security report (`add-landing-report`).** Security framed by the OWASP Top 10 (owner, 2026-10-24): each category that applies to a static landing is checked and the rest are reported as not applicable with the reason. On top of today's QA: security headers (CSP, HSTS, framing, referrer, permissions policy), TLS of the deployed URL, `npm audit`, secret scanning, third-party request inventory, broken links, and real-user Web Vitals after deployment with a scheduled re-check. One readable report per landing with a pass, warn or fail per area.
4. **Legal compliance (`add-legal-compliance`, owner, 2026-10-24).** Cookies and trackers detected on a real page load (a consent banner only when non-essential cookies exist; cookieless analytics preferred), the legal notice and privacy policy each market requires (for example LSSI-CE and GDPR in Spain and the EU) generated from customer data in the brief and never invented, and price-reduction claims flagged for review. A new "legal" area in the landing report. It helps compliance; it is not legal advice.
5. **AI images (`add-ai-images`, owner, 2026-10-24).** A fourth image source next to the customer's own files, Commons/The Met and code-rendered posters: images generated with an AI image service, recorded in `assets.json` with the generator, model, prompt, date and the generator's commercial-use terms. Needs the service's API key as an environment secret. AI images never pose as real photos of a business, its people or its products, and the final check enforces the provenance record.
6. **Deploy adapters (`add-deploy-adapters`).** The output is static `dist/`, so each target is an adapter with a script and a guide: Cloudflare Pages (today), Vercel and Netlify (CLI or API token, per-branch previews), any VPS (SFTP or rsync plus Caddy or Nginx with automatic HTTPS, or a container), shared hosting such as Hostinger (SFTP or FTP to `public_html`, or its Git deploy). Each guide ends with pointing the domain and running the report of step 3 on the final URL.
7. **Productization (`add-agent-interface`).** An MCP server as the main interface so any agent can drive the pipeline (`create_brief`, `propose_landing`, `generate_landing`, `get_status`, `get_report`, `deploy`), with an HTTP API and the CLI next to it. Generation runs as an asynchronous job in an isolated container (it takes 30 to 70 minutes). Token and machine cost are recorded per run to price it. A legal review of reference analysis and image licensing comes before selling.
8. **3D models (`add-3d-models`).** glTF models next to code-built scenes: generated with tools such as Meshy, bought, commissioned or openly licensed, or provided by the customer (for example a Drive link in the brief). Pipeline: license and provenance in `assets.json` (including the generator's terms for AI-made models), validation, compression (meshopt or Draco, KTX2 textures) and a size budget, plus a rendered poster. It enables cases like a navigable 3D samurai.

## One landing, one repository: gradually

1. **Now (model A):** landings live in `sites/<slug>/` in this repository. Fine for the factory's own tests.
2. **Export:** a command turns a site into a standalone repository (its own `package.json`, lockfile, CI with QA and deploy for its target, `CREDITS.md`, report). A landing can "graduate" to its own repository when it goes to a customer; the factory keeps nothing of it but a reference.
3. **Generate straight into a repository:** new landings are created in their own repository from a template (the starter), and the factory holds only tooling, archetypes and pattern sheets. Needs repository creation permissions for the agent (GitHub App or token).
4. **Product storage:** one repository (or artifact store) per customer landing, created by the job runner of step 7, with access for the customer.

## Real test

The owner's digital-products landing is the first customer case. It should run after steps 1 and 2 so it benefits from archetype blending and a real intake, and it can serve as the validation of step 2.
