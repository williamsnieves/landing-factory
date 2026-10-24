# ai-images Specification Delta

## Purpose

Adds AI-generated images as a recorded image source for landings: generation through the chosen provider or import of images the owner made, with provenance, customer consent, a prompt policy that keeps AI images from posing as real photos of the business, a cost cap and a visible disclosure enforced by the final check.

## ADDED Requirements

### Requirement: Generate an AI image into a site
The repo SHALL offer a command that generates one image from a prompt with the configured provider, saves it under the site's image folder and appends a provenance entry to the site's asset manifest. It exits 0 on success, 1 when the request is refused or fails, and 2 on bad usage.

#### Scenario: Successful generation
- **WHEN** the command runs with a site, a prompt and a file name, and the provider returns an image
- **THEN** the file exists in the site's image folder and `assets.json` has an entry with `source: "ai"`, the generator, model, prompt, size, quality, creation date and terms link

#### Scenario: Dry run
- **WHEN** the command runs with `--dry-run`
- **THEN** it prints the request it would send, makes no network call and changes no file

### Requirement: Import an AI image made elsewhere
The repo SHALL offer a command that records an image the owner generated with their own tool, requiring the generator, model, prompt, creation date and terms link, and copying the file into the site's image folder.

#### Scenario: Missing prompt
- **WHEN** the import runs without a prompt
- **THEN** it exits with code 2 naming the missing field and changes nothing

### Requirement: API key handling
The provider key SHALL be read only from the environment and MUST NOT appear in any output, log, manifest or error message; a missing key ends the command with exit 1 naming the variable, without a request.

#### Scenario: Provider error echoes the key
- **WHEN** the provider answers with an error body that contains the key
- **THEN** the printed error has the key masked and the run exits 1

#### Scenario: No key
- **WHEN** the command runs without the key variable set
- **THEN** it exits 1 naming the variable and sends no request

### Requirement: Prompt policy
The command SHALL refuse, with the reason, a prompt that names the business or one of its products from the brief, asks for its team, staff, customers, founder, testimonials or logo, a real named person, or results such as before and after, so AI images never pose as real photos of the business, its people or its products.

#### Scenario: Product named in the prompt
- **WHEN** the brief has a product "Meshy 54 3D models" and the prompt contains that name
- **THEN** the command exits 1 naming the policy rule and sends no request

#### Scenario: Abstract art
- **WHEN** the prompt asks for an abstract gradient of light and glass shapes
- **THEN** the policy allows it

### Requirement: Customer consent
With a brief, the command SHALL generate or import only when the brief's AI-image field is `allowed`; without a brief it is allowed.

#### Scenario: Customer said no
- **WHEN** the brief's AI-image field is `not-allowed`
- **THEN** the command exits 1 saying the customer did not allow AI images

### Requirement: Cost cap
The command SHALL refuse to generate when the site already has as many AI images as the configured cap (default 12), naming the cap.

#### Scenario: Cap reached
- **WHEN** a site has 12 entries with `source: "ai"` and the cap is 12
- **THEN** the command exits 1 naming the cap and sends no request

### Requirement: Credits and disclosure
The credits SHALL list AI images in their own section with generator, model and date, and the final check SHALL fail when a site uses an AI image and its built home page has no visible element marked as the AI disclosure.

#### Scenario: Missing disclosure
- **WHEN** a site has an AI image in its manifest and the built page has no AI disclosure element
- **THEN** the final check fails naming the disclosure rule

### Requirement: Provenance enforced by the final check
The final check SHALL fail when an AI entry lacks a provenance field, its file is missing, or the brief does not allow AI images and an AI entry exists.

#### Scenario: Entry without model
- **WHEN** an `assets.json` entry with `source: "ai"` has no `model`
- **THEN** the final check fails naming the file and the missing field
