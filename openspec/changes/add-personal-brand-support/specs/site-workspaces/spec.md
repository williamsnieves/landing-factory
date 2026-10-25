# site-workspaces Specification Delta

## MODIFIED Requirements

### Requirement: Scaffold a new site
The repo SHALL offer a command that creates `sites/<slug>/` from the starter: layout, motion layer, styles, security headers and configuration, without the starter's demo pages, with a placeholder home page, a default `noindex` 404 page that links home (in English or the requested language) and an empty credits file. It MUST refuse invalid slugs and existing folders, except, when asked to keep planning material, a folder that holds only top-level Markdown docs, `brief.json` and, next to a brief, an `assets/` folder; that material is kept and never overwritten.

#### Scenario: New site
- **WHEN** the scaffold command runs with slug `cafeteria`
- **THEN** `sites/cafeteria/` exists, builds, and its site configuration names its own Pages project

#### Scenario: Default 404 page
- **WHEN** the scaffold command runs with slug `cafeteria` and `--lang es`, and the site is built
- **THEN** `sites/cafeteria/dist/404.html` exists, is `noindex`, has `lang="es"` and links to `/`, and the landing report's 404 item passes

#### Scenario: Existing site
- **WHEN** the scaffold command runs with a slug whose folder already exists
- **THEN** it exits with a non-zero code and changes nothing

#### Scenario: Folder prepared by the brief interview
- **WHEN** the scaffold command runs with planning material allowed on a folder holding `brief.json` and `assets/logo.webp`
- **THEN** the site is created and `brief.json` and `assets/logo.webp` are unchanged

#### Scenario: Assets folder without a brief
- **WHEN** the folder holds `assets/` but no `brief.json`
- **THEN** the command exits with a non-zero code naming `assets` and changes nothing
