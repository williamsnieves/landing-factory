# Customer runs

One row per real customer taken through the flow by hand (see `docs/channels.md`, "Before building"). The owner stands in for the chat. Costs come from `RUN.md` (`Usage:`) and `sites/<slug>/revisions.json`, never estimated. The channels and the remote engine are built only after 3 or more rows.

| Customer (slug) | Interview date | Interview complete (required left) | Directions (count, cost) | First preview (date, days after interview) | Build cost | Rounds (count, cost, needs-rebuild) | Exported / transferred | Chat notes (small requests, what needed the web) |
| --------------- | -------------- | ---------------------------------- | ------------------------ | ------------------------------------------ | ---------- | ----------------------------------- | ---------------------- | ------------------------------------------------ |

No customer yet (2026-10-30).

## Test runs (not counted toward the gate)

End-to-end runs with a fictional business, the owner standing in for the customer. They measure the flow and its cost but do not count as customers.

| Test (slug) | Dates | Directions (count, time, cost) | Choice | Build (time, cost) | Changes after the build | Total | Notes |
| ----------- | ----- | ------------------------------ | ------ | ------------------ | ----------------------- | ----- | ----- |
| `casavela` (real-estate agency and mortgage adviser, Valencia, Spanish, no form) | 2026-10-28 to 2026-10-30 | 3, 35 min, $16.75 | a (custom, split hero, sticky mortgage calculator) with c's Valencia photo and local strip; palette left to ui-ux-pro-max | 40 min, $16.53 (QA 100/100/100) | Palette change (brick to navy and sand, from the owner's Pinterest board): rebuild-class, done by resuming from the design system, 10 min, $3.93. No revision round was needed | $37.21, about 85 min of machine time | Found and fixed the reveal end-state bug in every landing (PR #39, #40). See `docs/status.md`, "casavela test: findings" |

