# Spec Delta

## Purpose

Defines the common technical base every landing in the system is built on: static build, accessible layout with SEO, design tokens and a predictable folder structure for agents.

## ADDED Requirements

### Requirement: Reproducible static build
The system SHALL produce a static site in `dist/` with a single build command, with no type or compile errors, starting from a clean dependency install.

#### Scenario: Build from scratch
- **WHEN** `npm ci` followed by `npm run build` runs on a clean checkout
- **THEN** the command exits with code 0
- **AND** `dist/index.html` exists

#### Scenario: Type check
- **WHEN** `npm run check` runs
- **THEN** the command exits with code 0 and reports no errors

### Requirement: Development server
The system SHALL provide a local development server with hot reload.

#### Scenario: Dev startup
- **WHEN** `npm run dev` runs
- **THEN** the home page responds with HTTP 200 on the local port printed by the command

### Requirement: Base layout with SEO metadata
Every page SHALL render inside a base layout that emits `lang` on `<html>`, `<title>`, meta description, Open Graph metadata and viewport, from the page's props.

#### Scenario: Page with metadata
- **WHEN** a page uses the base layout with a title and description
- **THEN** the generated HTML contains `<html lang="...">`, `<title>`, `<meta name="description">`, `og:title`, `og:description` and `<meta name="viewport">`

### Requirement: Structural accessibility of the layout
The base layout SHALL include a "skip to content" link, a single `<main>` with a target id, and semantic landmarks.

#### Scenario: Keyboard navigation
- **WHEN** a user presses Tab for the first time on any page
- **THEN** the first focused element is the "skip to content" link, and activating it moves focus to `<main>`

### Requirement: Centralized design tokens
Colors, fonts, type scale, spacing and radii SHALL be defined as CSS variables in a single place, and style utilities SHALL consume those variables, so changing a site's theme requires no component edits.

#### Scenario: Palette change
- **WHEN** the primary color variable is changed in the tokens file
- **THEN** every component using the primary color reflects the new value after the build, with no other changes

### Requirement: System folder structure
The repo SHALL contain the folders `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/` and `scripts/`, each with a short README explaining its purpose.

#### Scenario: Structure present
- **WHEN** the repo is listed after applying the change
- **THEN** all listed folders exist and each has its README

### Requirement: Interactive islands with no JavaScript by default
Pages SHALL be static HTML by default; React components SHALL hydrate only when they declare an explicit client directive.

#### Scenario: Page without islands
- **WHEN** a page that uses no components with a client directive is built
- **THEN** the resulting HTML does not load the React runtime
