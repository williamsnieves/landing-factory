# Pilot lessons: panaderia (first manual run)

What the first landing (`sites/panaderia/`, "Horno Lento") took by hand, what was slow and what failed. Input for `add-new-landing-skill` task 0.1.

## Timeline and cost

| Step                                                  | Tooling                                    | Wall clock         | Notes                                                                                    |
| ----------------------------------------------------- | ------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------- |
| References (3 sites)                                  | `/analyze-reference`                       | about 1 h          | Sonoma needed a manual wheel-scroll workaround (known gap)                               |
| Proposal and review                                   | by hand                                    | 1 review round     | Four decisions from the user (brand, city, language, gluten-free variants, personality) |
| Design system                                         | ui-ux-pro-max (11 queries)                 | about 3 min        | Four conflicts with the proposal, resolved toward the approved proposal                  |
| Build and QA, two rounds                              | taste-skill, `npm run qa -- --site`        | about 35 min       | Most of the time went into finding images                                                |
| Review round (repeated photos, gluten-free pictures) | main session review of the QA screenshots  | about 10 min       | QA was green but the page was not finished: only a human look caught it                  |

## Repeated by hand (automate in `/new-landing`)

- Network setup: image hosts had to be added to the environment's allowed domains before the build could start. Check reachability first and name the missing hosts in one message.
- Image sourcing: search, look at each candidate, read author and license, download, crop out signs and text, and record credits. Automate it as a vetted-image manifest (file, source, author, license, crop box). Generate `CREDITS.md` and the footer credit line from the manifest.
- Repetition rule: each source photo at most twice per page and never twice in one section. QA does not check this; a manifest-based check could.
- Product truthfulness: images must match the product named (the first build showed wheat bread on "Sin gluten" tiles). The image step should map each product to its own picture.
- Reviewing screenshots: QA writes full-page screenshots; a person (or the main session) still had to slice them and look. Pinned sections show as empty space in full-page captures, so add per-section viewport screenshots.
- Leftover processes: `astro preview` servers were left running twice after QA runs by the subagent; kill by PID and check before handing back.

## Slow

- Wikimedia Commons is rate-limited (HTTP 429) on the shared egress; every search and thumbnail needed retries. `thumb.wikimedia.org` is blocked; full images come from `upload.wikimedia.org` at standard widths.
- Openverse (`api.openverse.org`) is allowed but times out; Pexels blocks bots; Unsplash photo pages need authorization to verify the author, so no Unsplash photo was used. An Unsplash route needs an API key.
- `npm test` takes about 100 s; run it in the background in agent sessions.

## Failed or needed workarounds

- taste-skill `scripts/assets.mjs` ignores `HTTPS_PROXY` (`ENOTFOUND` behind the cloud proxy). Searches were done with `curl` against the Commons API instead. Do not edit the vendored skill; wrap or replace the step in our own script with the proxy re-exec used by `recon.mjs`.
- taste-skill rules disagree with the fixed design system (it discourages a cream ground with rust accents, pill buttons and photos under headlines). The approved proposal and MASTER.md won; `/new-landing` should pass the fixed palette and type to the skill explicitly (`draw.mjs --keep palette,type`) and record disagreements.
- ui-ux-pro-max's first pick for a bakery ("Vibrant & Block-based", yellow ground, Playfair) did not fit an editorial brief. Feed it the proposal's direction line, not only the niche.
- The QA clipped-text check flags `sr-only` captions and the deliberately clipped marquee word. Use `aria-label` on tables; document `data-qa-allow-clip` as the standard for marquee words.
- `-webkit-text-stroke` on a variable font shows overlapping contours; fill with the page color and use a doubled stroke with `paint-order: stroke fill`.
- `pkill -f` in an agent shell can kill the shell itself; use PIDs.

## New pieces worth moving into the starter

- `data-marquee-scrub` (horizontal scrubbed travel, off under reduced motion) and `data-pin-steps` (mirrors the active step in a pinned section). Both live only in `sites/panaderia/src/components/motion/` today; a later change can promote them to the root starter.
- A pinned-steps layout where pinned and stacked states share one DOM (`display: contents`, `.js-motion` and a media query), so images are not duplicated.

## Content to confirm before a real launch

Address, phone and email are placeholders. Prices, opening hours, the "36 h" and "3 harinas" facts and the "Marta" starter are sample copy. All photos are representative stock (Commons), not the bakery's own; the oven photo shows a clay oven, not a Barcelona bakery. "Abierto hoy hasta las 20:00" is static text.
