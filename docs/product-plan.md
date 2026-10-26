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
7. **Productization (`add-agent-interface`).** The main interface is an MCP server so any agent can drive the pipeline. **Local now (owner, 2026-10-25):** a server next to the repository over stdio (`scripts/mcp/server.mjs`, guide in `docs/agent-interface.md`) with every action except publishing: brief tools, `propose_landing`, `generate_landing`, `run_qa`, `run_report`, job status, log and cancel, and the latest QA and report results. Generation runs as a background job (it takes 30 to 70 minutes) and the tokens and cost Claude Code reports are recorded per run to price it. Publishing stays a pull request plus CI. **Remote later:** an HTTP transport and API next to the CLI, authentication and several users, each generation in an isolated container, `create_brief` and `deploy` style actions with their own approvals, and billing. A legal review of reference analysis and image licensing comes before selling.
8. **3D models (`add-3d-models`).** glTF models next to code-built scenes: generated with tools such as Meshy, bought, commissioned or openly licensed, or provided by the customer (for example a Drive link in the brief). Pipeline: license and provenance in `assets.json` (including the generator's terms for AI-made models), validation, compression (meshopt or Draco, KTX2 textures) and a size budget, plus a rendered poster. It enables cases like a navigable 3D samurai.

### Next steps (owner, 2026-10-26)

Agreed after the export command (`add-site-export`), in this order:

9. **Code quality (`add-code-quality`).** QA and the report judge the result (speed, accessibility, security, design), not how the code is written. This step adds an architecture contract for every landing, not only multi-locale ones: section copy and data in typed modules, typed `Props` on every component, pages that only compose sections. It adds a linter (ESLint with the Astro and accessibility rules) and an unused-file check in the factory's CI and in exported repositories. The 3D layer is copied to a site only when it has a scene. Done before the owner's landing moves, so its repository starts with the linter.
10. **Move the owner's landing.** `personal-brand` is exported to its own GitHub repository, deploys to Vercel and takes the williansnieves.com domain from Netlify.
11. **Preview before building (`add-landing-preview`).** After the interview the customer sees 2 or 3 short visual directions: a real page with the hero and one section each, built from the archetype blends `pick-archetypes` ranks, published at a draft preview URL. The customer picks one and comments; the full build starts from the approved direction. After delivery, a `revise_landing` job edits the landing from feedback instead of generating it again. Showing three directions (about $1 to $1.50 each, to be measured) costs less than one discarded build (about $5 and 30 to 70 minutes).
12. **Channels (decision to record, then build on step 7's remote API).** A chat channel and a web app, as thin clients of one engine (the remote MCP/API with jobs in containers, authentication and storage per customer):
    - **Web app (source of truth):** previews side by side with comments, approval, structured data such as prices and legal fields, billing, history and the list of landings.
    - **Chat (entry and notifications):** the interview, which suits a conversation, voice notes and photos, plus "your preview is ready" with a link to the web app, and small changes. Telegram first, since its bot API is free and simple. WhatsApp when there are paying customers, because of Meta business verification, templates, the 24-hour window and per-conversation pricing.
    - **Before building either:** run 3 to 5 real customers through the flow by hand, with the owner standing in for the chat. Measure interview completion, time to the first preview, rounds of changes and cost per landing.

## One landing, one repository: gradually

1. **Now (model A):** landings live in `sites/<slug>/` in this repository. Fine for the factory's own tests.
2. **Export:** a command turns a site into a standalone repository (its own `package.json`, lockfile, CI with QA and deploy for its target, `CREDITS.md`, report). A landing can "graduate" to its own repository when it goes to a customer; the factory keeps nothing of it but a reference.
3. **Generate straight into a repository:** new landings are created in their own repository from a template (the starter), and the factory holds only tooling, archetypes and pattern sheets. Needs repository creation permissions for the agent (GitHub App or token).
4. **Product storage:** one repository (or artifact store) per customer landing, created by the job runner of step 7, with access for the customer.

## Real test

The owner's digital-products landing is the first customer case. It should run after steps 1 and 2 so it benefits from archetype blending and a real intake, and it can serve as the validation of step 2.
