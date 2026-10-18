# site-workspaces Specification

## Purpose
Defines how each generated landing lives in the factory repo as an independent site under `sites/<slug>/`, so it can be built, checked and deployed on its own while sharing tooling and dependencies with the factory.

## Requirements

### Requirement: One folder per site
Every landing SHALL live in `sites/<slug>/` as a complete static Astro site with its own source, public assets, site configuration and credits file, and SHALL build into `sites/<slug>/dist/` with a single command.

#### Scenario: Build one site
- **WHEN** the build command for `sites/panaderia` runs on a clean checkout after installing dependencies
- **THEN** it exits with code 0 and `sites/panaderia/dist/index.html` exists

### Requirement: Shared, pinned dependencies
Sites SHALL share the factory's dependency versions through workspaces, so one install at the repo root serves the factory and every site.

#### Scenario: Single install
- **WHEN** `npm ci` runs at the repo root
- **THEN** every site under `sites/` can be built without a separate install

### Requirement: Scaffold a new site
The repo SHALL offer a command that creates `sites/<slug>/` from the starter: layout, motion layer, styles, security headers and configuration, without the starter's demo pages, with a placeholder home page and an empty credits file. It MUST refuse invalid slugs and existing folders.

#### Scenario: New site
- **WHEN** the scaffold command runs with slug `cafeteria`
- **THEN** `sites/cafeteria/` exists, builds, and its site configuration names its own Pages project

#### Scenario: Existing site
- **WHEN** the scaffold command runs with a slug whose folder already exists
- **THEN** it exits with a non-zero code and changes nothing

### Requirement: Sites are independent
A change in one site's folder MUST NOT change the build output of another site or of the factory starter.

#### Scenario: Edit one site
- **WHEN** only files under `sites/panaderia/` change
- **THEN** the factory starter and other sites build to the same output as before
