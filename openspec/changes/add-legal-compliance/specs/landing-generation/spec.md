# landing-generation Specification Delta

## ADDED Requirements

### Requirement: Legal pages from the brief
When the brief names a market, generation SHALL add the legal pages that market requires, rendered from the brief's legal data in the page language, and link them from every page's footer; a missing required value SHALL render a visible pending-review marker instead of an invented value.

#### Scenario: Spanish customer
- **WHEN** a landing is generated from a brief with market `ES`, a holder and a privacy contact
- **THEN** the site has a legal notice and a privacy policy showing the holder's name, tax id, address and email, and the footer links to both

#### Scenario: Brief without a market
- **WHEN** the brief names no market
- **THEN** no legal pages are added and the run log lists the legal requirements as unknown under Decisions
