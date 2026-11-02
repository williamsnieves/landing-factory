# Ethics checklist

The last item of the Conversion plan. Tick each line or write why it does not apply. Persuasion helps a visitor decide; it never takes the decision away.

## Checklist

- [ ] Every claim, price, guarantee, deadline and proof comes from the brief, in the customer's words. Nothing is invented or "improved".
- [ ] Urgency and scarcity are real and stated by the customer. A deadline is written as a date ("until 30 November"), never as a ticking timer.
- [ ] No fear or anger as an emotional target. The problem is named plainly; the visitor is not frightened into acting.
- [ ] The decline is as easy and as polite as the accept. "No, thanks" says only that. No confirmshaming ("No, I prefer to keep losing money").
- [ ] No pre-checked boxes. Consent and extras start unchecked, and a form asks only for what the next step needs.
- [ ] The price is visible with what it includes. No hidden costs, no drip pricing, no price shown only after a form.
- [ ] The highlighted option is highlighted for a reason that helps the visitor (it fits most visitors), not to push the dearest one.
- [ ] No fake social proof: no invented testimonials, ratings, counters ("12 people are looking at this"), logos or awards. Star markup only with real, sourced reviews.
- [ ] No people in AI images, no stock face posing as a customer or the team. A gaze cue uses a licensed photo that really shows what it says.
- [ ] The call to action says what happens next. The same action is not dressed up as something else.
- [ ] Vulnerable audiences (health, money worries, children, grief) get calm, plain language and no pressure. A regulated niche makes no outcome promise.
- [ ] Nothing in the persuasion depends on the visitor not noticing it. If it would embarrass the owner when explained to the visitor, remove it.

## Where it is enforced

| Rule                     | Where                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Pre-checked boxes, countdown timers, confirmshaming | `check-landing` rule `dark-patterns` (fails)                |
| Promises, guaranteed results, health and money claims | `check-landing` rule `copy-claims` (fails, with warnings for figures and urgency wording) |
| Facts and prices as given | `check-landing` rule `brief-facts`                                                    |
| Proof only from the brief | the Copy plan's proof inventory; the audit's `proof-without-brief`                    |
| People in AI images       | the AI image prompt policy                                                            |

The checklist covers what the checks cannot read: intent. A person reads the page before it is published.
