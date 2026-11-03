## ADDED Requirements

### Requirement: Wait for a new deployment's certificate
With `--wait-tls <seconds>` (1 to 600, live runs only), the report SHALL request the deployed URL's home page every 10 seconds until it answers over HTTPS or the time runs out, and only then run the live checks unchanged, so the wait never turns a failure into a pass. CI SHALL pass `--wait-tls 300` to the live checks of each deployment URL.

#### Scenario: Certificate issued during the wait
- **WHEN** the home page fails TLS twice and then answers 200
- **THEN** the report waits twice, `live-tls` passes and the run records how long it waited

#### Scenario: Certificate never issued
- **WHEN** the home page fails TLS until the deadline
- **THEN** the report stops waiting at the deadline and `live-tls` fails as without the option

#### Scenario: Wait without live checks
- **WHEN** `--wait-tls 60` is given with `--only static` or without a URL
- **THEN** the run exits 2 naming the option
