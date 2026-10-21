# Design

## Context

See `proposal.md` — Why. Available at implementation time: starter, motion, design skills, QA, deployment, `/analyze-reference` and the `sites/<slug>/` workspaces. The first manual run (pilot, `sites/panaderia/`, PR #11) is done; its full notes are in `docs/pilot-panaderia-lessons.md`. This design encodes what worked there and automates what was done by hand.

### Pilot notes (task 0.1)

Repeated by hand, now automated by this change:

- Checking that image hosts are reachable before the build (the build was blocked until the user opened domains).
- Searching, vetting, downloading and crediting images; writing `CREDITS.md` and the footer credit line by hand from notes.
- Keeping each photo to at most two uses per page (QA does not check it; a review caught four uses of one photo).
- Matching product images to product names (the first build showed wheat bread on gluten-free tiles).
- Slicing full-page QA screenshots to review them; pinned sections show as blank space in full-page captures.
- Briefing ui-ux-pro-max and taste-skill with the proposal's direction and the fixed palette and fonts.
- Killing `astro preview` servers that subagents left running.

What failed or needed a workaround:

- taste-skill `scripts/assets.mjs` ignores `HTTPS_PROXY` (`ENOTFOUND` in cloud sessions); Commons searches were done with `curl`.
- Wikimedia Commons rate-limits the shared egress (HTTP 429); `thumb.wikimedia.org` is blocked, full images come from `upload.wikimedia.org`. Openverse times out, Pexels blocks bots, Unsplash photo pages need authorization to verify authors.
- ui-ux-pro-max's first pick for the niche ignored the editorial brief; taste-skill rules disagreed with the fixed palette. Both were resolved toward the approved proposal and recorded.
- The QA clipped-text check flags `sr-only` captions and deliberate marquee clipping (`aria-label` and `data-qa-allow-clip` are the fixes).

Cost observed: design system about 3 minutes; build plus two QA rounds about 35 minutes, most of it image sourcing; one human review round.

## Goals / Non-Goals

**Goals:** one command → site that passes QA and the landing checks; reviewable proposal; traceable decisions and credits; the pilot's manual steps become scripts with tests.

**Non-Goals:** multi-language, CMS, forms with a backend, 3D by default (only if the proposal justifies it), running generation from GitHub Actions (it needs an Anthropic API key secret; out of scope for now), generating several niches in this change (the three-niche diversity run is a follow-up pilot, see Decision 9).

## Decisions

1. **Where each site lives: `sites/<slug>/` inside this repo (model A)**, as delivered by `add-site-workspaces`: own `package.json`, `site.config.json`, Cloudflare Pages project, CI QA and deploy. The root starter stays the template source. `npm run new-site` gains templates for `PROPOSAL.md`, `RUN.md` and `assets.json`.
2. **Orchestrator skill + per-phase subagents**: `.claude/skills/new-landing/SKILL.md` chains the phases (brief → synthesis → checkpoint → design system → build → QA → final check) and delegates design system, build and QA to subagents with a brief that names their single skill. Each phase writes its artifact to disk (`PROPOSAL.md`, `MASTER.md`, `RUN.md`) so a run can resume from the last finished phase.
3. **Automatic mode from a Claude session**: `scripts/new-landing.sh <slug> --niche "..." [--refs a,b] [--auto] [--dry-run] [--max-attempts N]` runs the preflight, `npm run new-site`, then `claude -p "/new-landing ..."` with `--permission-mode acceptEdits` and the allowed tools in `.claude/settings.json`. It works from a terminal or a cloud session (verified: `claude -p` runs inside the cloud container). Without `--auto` it stops after the proposal (interactive checkpoint). `--dry-run` stops after `PROPOSAL.md` and `MASTER.md`.
4. **Preflight**: `scripts/preflight.mjs` checks, through the proxy when one is set, that the npm registry and the image sources (`commons.wikimedia.org`, `upload.wikimedia.org`) answer, that Chromium is found, and that the slug is free; it names every missing host in one message and exits non-zero before anything is created.
5. **Images: `scripts/find-images.mjs` + `sites/<slug>/assets.json`**. A repo script (the vendored skill is not edited) searches Wikimedia Commons through the proxy (same re-exec as `recon.mjs`), throttles requests and retries 429 with backoff, keeps only CC0, public domain, CC BY and CC BY-SA, reads author and license from `extmetadata`, and downloads chosen files into `sites/<slug>/src/assets/images/` while appending an entry to `assets.json` (file, source page, author, license, license URL, crop note). `scripts/credits.mjs --site <slug>` generates the photo table of `CREDITS.md` and a `credits` list the footer imports. taste-skill keeps the art-direction role and picks among candidates.
6. **Final landing check: `scripts/check-landing.mjs --site <slug> [--refs urls]`**, run after QA passes. It fails, naming the offending item, when: an image file under `src/assets/` or `public/` has no `assets.json` entry or `CREDITS.md` is out of sync; a source photo is imported in more than two places; a palette hex or font family in `design-system/<slug>/MASTER.md` is missing from the site's `tokens.css`; the site matches another site in `sites/` on primary color, display font and hero type all at once (diversity, read from a small fenced `landing-meta` block in each `MASTER.md`); or (with `--refs`) any 8-word n-gram of the built page text matches the visible text of a reference read in memory and never stored.
7. **QA loop**: max 5 attempts (configurable); each attempt reads `qa/<slug>/latest/report.json` and fixes failures in order overflow → clipped text → reduced motion → accessibility → SEO → performance → impeccable, then runs impeccable critique/polish once on a passing site. Exhausted attempts end the run with a non-zero exit and the remaining failures in `RUN.md`.
8. **Run log `sites/<slug>/RUN.md`**: inputs (niche, refs, mode), phase timestamps and duration, design decisions with any skill conflicts, image list, every QA attempt with verdict and failure counts, final check result. Approximate tokens when the session reports them.
9. **Validation in two steps**: this change validates with one niche (a dental clinic, no new references) generated by a single `new-landing.sh --auto` command, which must pass QA and the landing check with no touch-ups and deploy its preview. The three-niche diversity run (roadmap MVP check) is a separate pilot PR after merge; the diversity rule itself ships here as part of the final check.

## Risks / Trade-offs

- [ui-ux-pro-max vs taste-skill clash on visual direction] → the skill passes the fixed palette and type to taste-skill (`draw.mjs --keep palette,type`) and records disagreements in `RUN.md`; the approved proposal wins.
- [High cost and duration] → `--dry-run` generates only `PROPOSAL.md` + `MASTER.md`; image search runs in the background while sections are written.
- [Commons rate limits] → throttled search with backoff and a cap on candidates per query; the run log records waits.
- [QA never converges on motion-heavy sites] → attempt limit and failure log; the proposal caps heavy effects at one playful moment.
- [Stock photos are not the client's own] → `RUN.md` and the PR say so; the proposal asks whether real photos exist.
