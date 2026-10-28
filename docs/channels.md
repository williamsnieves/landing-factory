# Channels

How customers will reach the factory. The decision was recorded on 2026-10-28 (product plan, step 12). Nothing in this document is built yet: by owner decision, building waits until 3 to 5 real customers have gone through the flow by hand (see "Before building").

## The decision

- **One engine, thin clients.** Every channel calls the same engine: the factory's tools (`scripts/mcp/`) behind a remote API with authentication, jobs run in isolation and storage per customer. A channel never runs generation code itself, and never publishes.
- **The web app is the source of truth.** It shows the previews and directions side by side and takes comments on them. It records the approval and holds the structured data (prices, links, legal holder data), the history of rounds and the list of landings, and later the billing. What a customer approved is always what the web app shows.
- **Chat is the way in and the way to tell the customer something.**
  - It runs the interview, which suits a conversation, voice notes and photos.
  - It sends "your preview is ready", with a link to the web app.
  - It carries small changes.

  A chat message never approves a design or a price on its own: the web app confirms it.
- **Telegram before WhatsApp.** Telegram's Bot API is free, needs no business verification, and lets a bot write to a user at any time after the user starts it. WhatsApp waits for paying customers, because the WhatsApp Business Platform needs Meta business verification and approved message templates. It also limits free-form replies to a 24-hour window after the customer's last message, and Meta charges for template messages (check Meta's current pricing before planning costs).
- **The owner stays in the loop for publishing.** These stay with the owner, as they are today:
  - the export;
  - the sync to the customer's repository;
  - the transfer;
  - anything that spends the owner's hosting or domain.

  The engine can prepare them; a person approves them.

## What each channel does, mapped to the factory

| Step                                 | Factory today (`docs/agent-interface.md`)                       | Chat                                                       | Web app                                                 |
| ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| Interview                            | `/brief-intake`, `brief_init`, `brief_update`, `brief_missing`  | Asks only what is missing, takes photos and voice notes    | Shows the brief and lets the customer correct a field   |
| Visual directions                    | `preview_landing` (`new-landing.sh --directions`)               | "Your directions are ready" plus link                      | Directions side by side, choice and comments            |
| Choice                               | `choose_direction`                                              | No (link to the web)                                       | Records the choice (`directions.json`)                  |
| Full build                           | `generate_landing`                                              | "Your landing is ready" plus link                          | Preview, approval                                       |
| Changes                              | `revise_landing` (`revisions.json`)                             | Small requests ("change the phone number")                 | Comments on the page, list of rounds and their state    |
| Needs a rebuild                      | `Result: needs-rebuild`                                         | Explains it and links to the web                           | Offers directions or a new build                        |
| Publish, sync, transfer              | `/landing-handoff`, `sync-export.mjs`, `transfer.mjs` (owner)   | Notifies when done                                         | Shows the live URL and, after a transfer, the handover  |

## The engine (open decision)

Where the remote engine runs is not decided. A generation takes 30 to 70 minutes of Claude Code with tools, Chromium and the repository, so the choice matters.

| Option                             | For                                                                                                                                                                                                     | Against                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A VPS of the owner                 | Full control. Jobs already run as detached process groups (`scripts/mcp/jobs.mjs`). One fixed monthly cost.                                                                                            | The owner maintains it (updates, backups, Chromium). It needs isolation per job (containers) once there are several customers, plus an Anthropic API key on the server.                                                                                                                       |
| GitHub Actions in the factory repo | No server to keep. Logs, artifacts and secrets are already there, and the runners already run QA.                                                                                                       | Every run is a workflow start: the Claude GitHub App cannot dispatch one (403), so a token or another app is needed. There are minutes and time limits per job. Results come back as commits or artifacts, which is slower for a chat to report.                                              |
| Claude Code cloud sessions         | What the factory uses today (this kind of session). It has the repository, the tools and a proxy, and nothing to host.                                                                                  | It is driven by a person in a conversation, not by an API a bot can call. The network is limited by the environment's allow list. It suits the manual phase, not a customer-facing service.                                                                                                     |

Criteria for the decision, once measured:
- cost per landing at the observed number of rounds;
- time to the first preview;
- how many jobs run at once;
- who maintains it;
- how a job reports back to a chat.

## Before building

Owner decision (2026-10-28): no channel and no remote engine are built until 3 to 5 real customers have gone through the whole flow by hand, with the owner standing in for the chat:

1. Interview: `/brief-intake`.
2. Directions (`--directions`), optional.
3. Choice.
4. Build.
5. Rounds of changes (`npm run revise`).
6. Export, then sync, and transfer if wanted.

Record each customer as a row in `docs/customer-runs.md`. The factory already writes most of the numbers:

| Measure                         | Where it comes from                                                         |
| ------------------------------- | --------------------------------------------------------------------------- |
| Interview completion and time   | The owner's notes; `brief missing` at the end (required fields left)        |
| Time to the first preview       | Dates in `RUN.md` (directions or build) against the interview date          |
| Cost of directions and of build | The `Usage:` line of `RUN.md` (`.run-usage.json`)                           |
| Rounds of changes and their cost | `revisions.json` (count, `usage.costUsd`, `needs-rebuild` rounds)          |
| What the customer asked by chat | The owner's notes: which requests were small, which needed the web          |

**Gate to start building:** 3 or more customers recorded, the engine decided from those numbers, and a priced offer. Then the order is:

1. The remote engine: an HTTP transport and authentication over the existing tools, a job runner with isolation, and storage per customer.
2. The web app minimum: the list of landings, directions with choice and comments, the preview and approval, and the rounds.
3. The Telegram bot: interview, notifications, small changes.
4. WhatsApp and billing, with paying customers.

## Out of scope now

- Any code for the engine, the web app or the bots.
- Accounts for customers.
- Payments.
- A factory GitHub organization.
- Moving the publishing steps away from the owner.
