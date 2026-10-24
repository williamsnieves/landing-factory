# brief-intake Specification Delta

## ADDED Requirements

### Requirement: Legal identity, market and data processing
The brief SHALL hold the markets where the page is offered, the holder who runs it (name or company, tax id, address, email, register entry), a privacy contact and what the page does with personal data (analytics, forms, embeds). The interview SHALL ask for them when a market is named and MUST NOT invent or assume holder identity data.

#### Scenario: Holder data left to the agent
- **WHEN** the brief lists `legal.holder.taxId` in `assumed`
- **THEN** validation fails saying holder identity data cannot be assumed

#### Scenario: Market named, holder missing
- **WHEN** the brief names the market `ES` and has no holder tax id
- **THEN** `brief missing` lists the holder tax id among the recommended fields
