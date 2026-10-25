# landing-generation Specification Delta

## ADDED Requirements

### Requirement: 404 page in the build
Generation SHALL restyle the site's default 404 page in the landing's design, in the page language, with links to the home page and to the primary call to action, keeping it `noindex`, and the review step SHALL look at it.

#### Scenario: Generated landing
- **WHEN** a landing is generated
- **THEN** its build has `dist/404.html` in the landing's design, `noindex`, linking home and to the primary call to action, and QA still excludes it from the page checks

### Requirement: Owner portrait during generation
Generation SHALL use an AI image of a person only as the owner portrait of a personal brand, only when the brief has both `brand.aiImages` and `brand.ownerPortrait` allowed, only from a file the owner supplied (recorded with `--subject owner`), with alt text that calls it an AI-generated portrait and not a photo, and with the page's AI disclosure.

#### Scenario: Owner allows the portrait
- **WHEN** the brief of a personal brand allows AI images and the owner portrait and lists the owner's AI portrait as a file
- **THEN** the portrait is recorded with subject `owner`, the page shows it with alt text "AI-generated portrait of" the owner and carries the AI disclosure

#### Scenario: Owner portrait not allowed
- **WHEN** the brief leaves `brand.ownerPortrait` empty
- **THEN** the portrait is not used and the run log says why
