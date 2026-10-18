# sites

One folder per landing. Each `sites/<slug>/` is a complete static Astro site and an npm workspace named `site-<slug>`, so the factory's tooling (QA, CI, deploy) works on it and one `npm ci` at the repo root installs every site.

```text
sites/<slug>/
  package.json        private, name site-<slug>; same dependency ranges as the root
  astro.config.mjs    static output, React and Tailwind v4 (copied from the root)
  tsconfig.json
  site.config.json    Cloudflare Pages project (cloudflare.pagesProject) and production branch
  CREDITS.md          source URL, author and license of every external asset (photo table generated)
  assets.json         image manifest (written by scripts/find-images.mjs): file, source, author, license, credit
  PROPOSAL.md         the landing proposal (page map, motion plan, visual direction)
  RUN.md              run log of /new-landing: phases, QA attempts, decisions, result
  README.md
  qa.config.json      optional: QA thresholds for this site (falls back to the root file)
  src/                layouts/, components/motion/, styles/ (tokens.css), pages/
  public/             _headers, favicon.svg, site assets
  src/data/credits.json  generated list of credited photos for the footer
```

## Create a site

```bash
npm run new-site -- cafeteria --title "Cafetería Sol" --lang es --message "Estamos preparando la web."
npm install                          # registers the workspace; commit package-lock.json
npm run build -w site-cafeteria      # -> sites/cafeteria/dist/index.html
```

The scaffold copies the layout, motion layer, styles and headers from the root starter and writes a `noindex` placeholder home page, `site.config.json` (`pagesProject` equals the slug; change it if the name is taken on Cloudflare), `CREDITS.md`, `README.md`, the `PROPOSAL.md` and `RUN.md` templates and an empty `assets.json`. It never copies the starter's demo pages or sections. It refuses invalid slugs (`^[a-z0-9]+(-[a-z0-9]+)*$`) and existing folders. For a folder that so far holds only planning docs (`sites/panaderia/PROPOSAL.md`), pass `--allow-existing-docs`: the `*.md` files stay untouched.

Run `npm run new-site -- --help` for every option.

## Generate a whole site

`scripts/new-landing.sh <slug> --niche "..."` does the scaffold above and then runs the `/new-landing` skill: proposal, design system, build, QA loop and final check (see the root [README](../README.md#generating-a-landing)). Photos come from Wikimedia Commons through `node scripts/find-images.mjs` and are listed in `assets.json`; `node scripts/credits.mjs --site <slug>` writes `CREDITS.md` and `src/data/credits.json`, and the footer imports the latter. `node scripts/check-landing.mjs --site <slug>` is the final gate. A site's `design-system/<slug>/MASTER.md` ends with a `landing-meta` block (primary color, display font, hero type) that the diversity rule compares across sites.

## Work on a site

| Command                        | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `npm run dev -w site-<slug>`   | Dev server                                                        |
| `npm run build -w site-<slug>` | Static build into `sites/<slug>/dist/`                            |
| `npm run check -w site-<slug>` | `astro check` for this site (`npm run check:sites` for all)       |
| `npm run qa -- --site <slug>`  | Build, serve and verify every page; report in `qa/<slug>/latest/` |

A site is independent: its tokens, sections and pages are its own, and a change inside `sites/<slug>/` never changes another site or the root starter. Shared files (motion layer, layouts, styles) are copied at creation and may diverge. Use `ui-ux-pro-max` for the site's palette and fonts (`design-system/<slug>/`, then the site's own `src/styles/tokens.css`), and record every external asset in the site's `CREDITS.md`.

## CI

Pull requests and pushes to `main` build, check and deploy only the sites that changed (`scripts/changed-sites.mjs`); a change to a shared path (dependencies, motion layer, layouts, styles, QA scripts, workflows) runs every site. Each site is deployed to its own Cloudflare Pages project, with a preview URL per branch and one sticky PR comment per site. A failing QA never deploys. See the root [README](../README.md#deployment).
