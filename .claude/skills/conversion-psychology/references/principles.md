# Principles catalog

One entry per principle: what it means on a landing, how to apply it, its evidence level, the factory constraint it must respect and the version it must never become. Written for this repository in our own words.

**Evidence levels.** `strong`: consistent findings or basic usability practice, safe to base a decision on. `mixed`: plausible and often reported, but effects vary by context or replications disagree; use it when the brief supports it. `weak`: contested, small or single-study evidence; a tiebreaker only, and it never overrides legibility, contrast, QA or a brief fact. The factory measures no traffic, so none of these is tested on the landing itself.

## The ten strategies of the owner's guide

| Guide strategy         | Becomes                                                                                        | Evidence | Constraint                                                                           | Entry                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Irresistible headlines | A familiar phrase with a twist, as one 4U candidate in the Copy plan                           | mixed    | The Copy plan owns headlines                                                         | `emotion/familiar-twist-headline`         |
| Emotional responses    | One primary emotional target carried by copy, imagery and tone                                 | mixed    | Facts and tone come from the brief                                                   | `emotion/emotional-target`                |
| Attention with gaze    | A face looking toward the headline or call to action draws the eye there                       | mixed    | Licensed photo with a face only; never an AI person; no cropping of a customer photo | `attention/gaze-cue`                      |
| Dopamine and reward    | Visible progress on multi-step forms; "what you get" made concrete                             | weak     | Contests, points and gamification are out of scope                                   | `emotion/progress-and-reward`             |
| Colors and emotion     | The emotional target goes to ui-ux-pro-max as an input                                         | weak     | ui-ux-pro-max picks the palette; contrast rules stand                                | `emotion/color-emotion`                   |
| Fewer choices          | One primary call to action; at most three offers side by side; one highlighted with a reason   | strong   | Offers are the brief's                                                               | `choice/fewer-choices`                    |
| Pricing                | Anchors and order only with real prices; round against exact pricing is a note to the customer | mixed    | Prices are customer facts and are never changed                                      | `price/anchoring`, `price/round-vs-exact` |
| Fonts                  | Simple, legible type for actions; display type for one memorable line                          | weak     | ui-ux-pro-max picks fonts; legibility and QA win                                     | `fluency/font-disfluency`                 |
| Trust                  | Real proof, contact data, legal pages, process transparency, risk reversal the customer states | strong   | No invented proof or guarantee                                                       | `trust/real-proof`                        |
| The smile              | A positive human image only when a licensed photo exists and fits                              | weak     | Same as gaze                                                                         | `emotion/smile`                           |

## The branches of the mind map

| Branch                  | Where it lives                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Attention               | `attention/*`                                                                                                                               |
| Cognitive fluency       | `fluency/*`                                                                                                                                 |
| Emotion                 | `emotion/*`                                                                                                                                 |
| Trust                   | `trust/*`                                                                                                                                   |
| Reciprocity             | `reciprocity/*`                                                                                                                             |
| Risk reversal           | `risk/*`                                                                                                                                    |
| Decision architecture   | `choice/*`                                                                                                                                  |
| Price perception        | `price/*`                                                                                                                                   |
| Storytelling            | `emotion/story`, and the story frame of the Copy plan                                                                                       |
| Memory                  | `memory/*`                                                                                                                                  |
| Landing page psychology | the Conversion plan itself, this catalog applied to a page                                                                                  |
| Ecommerce               | only the parts a landing holds: product clarity (`fluency/plain-language`), returns and delivery information (`trust/transparency-of-terms`) |
| Ethics                  | `ethics/*` and `ethics.md`                                                                                                                  |

## Out of scope

| Topic                                           | Why                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Gamification, points, badges, contests          | A static landing has no state to reward; they pull attention from the one action         |
| Popups, exit-intent, sticky bars that interrupt | Interruptions hurt accessibility and Lighthouse; none is planned                         |
| Email sequences, post-purchase, loyalty         | They happen after the page                                                               |
| A/B tests, heatmaps, eye tracking, analytics    | They need traffic or a tracker; measurement for a live landing is outside the factory    |
| Neuroscience claims ("the brain does X")        | Not supported at the level a landing needs; no copy or document may claim them           |

## Attention

### attention/single-focal-point

- **Evidence:** strong
- **Means:** The first screen has one dominant element, so the visitor knows where to look and what the page is about within a few seconds.
- **Apply:** Make the headline or one image clearly the largest and highest-contrast thing in the hero. One primary call to action beside it. Everything else in the first screen is smaller or quieter.
- **Constraint:** The archetype's hero grammar decides the layout; the focal point works inside it. The hero has an `h1`.
- **Never:** Hiding the headline behind effects, or making three elements compete so that nothing reads first.

### attention/visual-hierarchy

- **Evidence:** strong
- **Means:** Size, contrast, space and position tell the visitor what matters most, second and least, in the order the Copy plan wants it read.
- **Apply:** Map the Copy plan's stages to a visible order: stage titles larger than supporting text, the call to action the strongest filled element, secondary links plain. Check on the section screenshots at 375 and 1440 px.
- **Constraint:** Tokens and the type scale come from MASTER.md; the review only changes emphasis in copy and the placement of actions.
- **Never:** Making every block equally loud, or shrinking legal or price information below legibility to hide it.

### attention/gaze-cue

- **Evidence:** mixed
- **Means:** People tend to follow where a face on the page looks, so a face turned toward the headline or the call to action can send attention there.
- **Apply:** Only when a licensed photo with a face exists and fits the niche, place it so the gaze points at the headline or button. Otherwise skip it; the page works without.
- **Constraint:** No AI-generated people (the one exception, the owner portrait of a personal brand, is a portrait and not a cue). Never crop or flip a customer's photo to aim it. Credit the photo as usual.
- **Never:** A stock face posing as a customer or the team, or a face used to imply an endorsement.

### attention/motion-restraint

- **Evidence:** mixed
- **Means:** Movement attracts the eye, so it should point at what matters and stay rare; constant motion makes everything and nothing stand out.
- **Apply:** At most one pinned section and one playful moment, as the Motion plan already says. Use reveal to order reading top to bottom, not to delay the call to action.
- **Constraint:** `prefers-reduced-motion` and no-JavaScript behavior stand; content is visible without motion.
- **Never:** Moving elements near the form or the call to action that make them harder to hit or read.

## Fluency

### fluency/plain-language

- **Evidence:** strong
- **Means:** Text that is easy to read and understand feels easier to act on; effort at the point of decision costs conversions.
- **Apply:** Short sentences, concrete nouns, the visitor's words from `audience` and `objections`, one idea per paragraph. Say what the product is and what happens next in the hero.
- **Constraint:** Copy follows the Copy plan and the brief's tone; the `copywriting` skill helps with sentences.
- **Never:** Jargon to sound expert, or vague claims that need the visitor to guess.

### fluency/scannable-structure

- **Evidence:** strong
- **Means:** Most visitors scan before they read; headings, short blocks and visible labels let them find their answer.
- **Apply:** Section headings that state the point, lists for parallel items, buttons labeled with the action. One `h1` and ordered headings.
- **Constraint:** Heading levels stay valid for accessibility and SEO; the report checks one `h1`.
- **Never:** Burying prices or the next step inside long paragraphs.

### fluency/familiar-patterns

- **Evidence:** strong
- **Means:** Visitors use what they already know: a logo that links home, a header call to action, a footer with contact data and legal links. Familiar placement lowers effort.
- **Apply:** Keep the conventional positions of the header, the call to action, the form and the footer even in an expressive layout. Be original in the look, not in where the button is.
- **Constraint:** The archetype's grammar may bend conventions with a reason in RUN.md "Design decisions".
- **Never:** A call to action disguised as decoration, or an unlabeled icon as the only way to act.

### fluency/legible-type-for-actions

- **Evidence:** strong
- **Means:** Buttons, form labels, prices and contact data must be read at once and without error; clear type there reduces mistakes and drop-off.
- **Apply:** Plain, high-contrast type at a comfortable size for actions and form text; display type is for one memorable line.
- **Constraint:** ui-ux-pro-max picks the fonts; contrast pairs are checked by `check-landing` and Lighthouse. The review changes no font.
- **Never:** An ornamental face on the button or a price in low contrast.

### fluency/font-disfluency

- **Evidence:** weak
- **Means:** Some studies report that slightly hard-to-read type makes people think harder and remember more. Replications are mixed and the effect is small.
- **Apply:** Do not use it. At most, note that a distinctive display face for one line can be memorable; it is a tiebreaker for a person.
- **Constraint:** Legibility and QA win; ui-ux-pro-max picks fonts.
- **Never:** Hard-to-read type for the offer, the price, the form or the call to action.

## Emotion

### emotion/emotional-target

- **Evidence:** mixed
- **Means:** A page feels coherent when copy, imagery and tone aim at one main feeling (for example trust for a clinic, calm for a therapist, excitement for a festival), and the feeling should match what the visitor needs to feel to act.
- **Apply:** Choose one of trust, calm, joy, excitement, pride, belonging or relief, with the reason from the brief. Let it guide word choice, image choice and pace.
- **Constraint:** Facts, tone and brand constraints come from the brief. The target is an input to ui-ux-pro-max, which picks palette and fonts alone.
- **Never:** Fear or anger as a target, or a feeling the business cannot honestly deliver.

### emotion/story

- **Evidence:** mixed
- **Means:** A short concrete story (a situation, a change, a result the customer actually gave) is easier to follow and remember than a list of features.
- **Apply:** Use the story frame of the Copy plan when the framework calls for it, built from the brief's own facts and `proof`.
- **Constraint:** No invented customers, quotes or outcomes; the Copy plan owns the structure.
- **Never:** A made-up case study, or a story that implies a result the customer did not state.

### emotion/familiar-twist-headline

- **Evidence:** mixed
- **Means:** A well-known phrase with one changed word is quickly understood and can feel fresh; it works when the twist says something true about the offer.
- **Apply:** Offer it as one of the two or three hero candidates in the Copy plan and score it with 4U like the rest.
- **Constraint:** The Copy plan owns headlines; the claims check applies to the result.
- **Never:** A twist that promises more than the offer, or copying a slogan of another brand.

### emotion/color-emotion

- **Evidence:** weak
- **Means:** Popular lists tie colors to feelings (blue to trust, red to urgency). The research is inconsistent, depends on culture and context and is dominated by brightness and contrast effects.
- **Apply:** Pass the emotional target to ui-ux-pro-max as one input among the niche, the brief's brand constraints and the archetype. Do not choose a color from an emotion list.
- **Constraint:** ui-ux-pro-max picks the palette; contrast and the brief's brand colors win.
- **Never:** Recoloring a call to action for "psychology" in the review, or claiming a color converts better.

### emotion/smile

- **Evidence:** weak
- **Means:** Positive faces may raise warmth in some contexts, with small and inconsistent effects on spending.
- **Apply:** Use a smiling person only when a licensed photo exists, fits the niche and is not posing as the team or a customer.
- **Constraint:** Same as the gaze cue: no AI people, no cropping of a customer photo.
- **Never:** A smile used as a stand-in for proof, or a staged "happy customer".

### emotion/progress-and-reward

- **Evidence:** weak
- **Means:** Claims about dopamine and reward are a popular simplification. What holds up in practice is plain: people continue more readily when progress is visible and the benefit is concrete.
- **Apply:** On a multi-step form show the step ("2 of 3"). Say exactly what the visitor gets and when ("a price within 24 hours" only if the customer states it).
- **Constraint:** No points, badges, streaks, contests or surprise rewards; the page is static.
- **Never:** Variable rewards or "spin to win" mechanics, or a vague bonus the customer did not offer.

## Trust

### trust/real-proof

- **Evidence:** strong
- **Means:** Evidence from other people and from facts (testimonials, figures, credentials, press, awards) lowers perceived risk more than the business's own claims.
- **Apply:** Show the brief's `proof` entries in the customer's words, with the source link when there is one, near the call to action they support. With none, say "no proof available" in the plan and show none.
- **Constraint:** Only `proof` from the brief; no review or rating markup without real, sourced reviews.
- **Never:** Invented testimonials, ratings, counters, logos, studies or "years of experience".

### trust/contact-and-identity

- **Evidence:** strong
- **Means:** A visible name, address, phone and email show that a real business is behind the page.
- **Apply:** Put the brief's non-assumed contact data in the footer and the contact section, and make the phone and email links.
- **Constraint:** Contact data is the brief's; assumed values are labeled as placeholders and not presented as real.
- **Never:** A fake address, a number that does not answer, or a contact form as the only way to reach a real business.

### trust/legal-and-policies

- **Evidence:** strong
- **Means:** Visible legal notice, privacy policy and terms signal that the business follows the rules and handles data openly.
- **Apply:** Link the legal pages the market requires from every footer; mention privacy next to forms.
- **Constraint:** Pages come from `legal.json` and are not legal advice; holder identity is never invented.
- **Never:** Hiding the legal links, or presenting the pages as a certification.

### trust/transparency-of-terms

- **Evidence:** strong
- **Means:** Clear prices, what is included, delivery or returns information and next steps remove the fear of a surprise.
- **Apply:** State the price, what it includes, how long it takes and what happens after the click, using the brief's facts.
- **Constraint:** Facts and prices are the brief's; the report warns about discount claims.
- **Never:** Fees revealed late, or conditions only in fine print.

### trust/process-transparency

- **Evidence:** mixed
- **Means:** Showing how the service works (steps, who does what) makes the unknown feel manageable, and is the honest substitute for proof the business does not have yet.
- **Apply:** A short numbered "how it works" using the brief's description of the process.
- **Constraint:** Steps are the customer's; no invented guarantees or timeframes.
- **Never:** Steps that imply results or speed the customer did not state.

### trust/specificity

- **Evidence:** mixed
- **Means:** Concrete details (a neighborhood, a material, a number the customer gave) are more believable than general superlatives.
- **Apply:** Prefer a specific fact from the brief over an adjective.
- **Constraint:** Figures need a source or the customer's own statement; `copy-claims` warns about unsourced percentages and round numbers.
- **Never:** A precise-looking number with no source.

## Risk

### risk/risk-reversal

- **Evidence:** strong
- **Means:** A visitor acts more readily when the downside is covered: a trial, a refund, a free first step, a cancellation right.
- **Apply:** Show the guarantee, trial or refund only if the brief states it, near the call to action and the price, in the customer's words.
- **Constraint:** `copy-claims` fails guaranteed results; a guarantee in the customer's own words becomes a warning for a person to confirm.
- **Never:** Inventing a guarantee, a 30-day refund or "no risk" the customer did not give.

### risk/objection-handling

- **Evidence:** strong
- **Means:** Every visitor has doubts (price, time, quality, trust, "is it for me?"); answering them where they arise removes reasons to leave.
- **Apply:** Map `audience.objections` to a place on the page: a line near the price, a short FAQ, a note beside the form.
- **Constraint:** Answers come from the brief; an objection with no answer is listed for a person, not guessed.
- **Never:** Dismissing an objection, or answering it with a claim the customer cannot back up.

### risk/low-commitment-first-step

- **Evidence:** mixed
- **Means:** A small first ask (a free valuation, a question, a call) is easier to accept than a large commitment, and a visitor who has taken it tends to continue.
- **Apply:** If the brief has a free or low-effort first step, make it the primary call to action. Keep forms short.
- **Constraint:** The first step is the customer's offer. Fields beyond what the step needs are cut, only optional ones in the review.
- **Never:** A "free" step that needs a payment method or hides a subscription.

## Choice

### choice/fewer-choices

- **Evidence:** strong
- **Means:** One clear next step beats many. The much-quoted jam study has mixed replications, but the practical rule is solid: every extra link or option adds effort and splits attention.
- **Apply:** One primary call to action, repeated in the hero and the closing section. A visually weaker secondary action at most. No more than three offers side by side. Few distinct destinations in `<main>`.
- **Constraint:** The offers and links are the brief's; the review reorders, hides a secondary action and cuts optional fields, but never removes an offer.
- **Never:** Hiding the decline or other options to force a click, or removing a required legal link.

### choice/highlighted-option

- **Evidence:** mixed
- **Means:** Marking one option as the usual choice helps visitors decide, because people compare against a clear reference.
- **Apply:** When three offers are shown, highlight one and write the reason ("most chosen" only if the customer says so; otherwise "includes X").
- **Constraint:** The offers, names and prices are the brief's.
- **Never:** Highlighting the dearest option with no reason, or a fake "most popular" label.

### choice/defaults-that-serve-the-visitor

- **Evidence:** strong
- **Means:** Defaults are powerful because most people keep them, which is why they carry an ethical duty.
- **Apply:** Pre-select a sensible, reversible option such as the form's contact method. Consent, newsletters and extras start unchecked.
- **Constraint:** `dark-patterns` fails a pre-checked box in a form.
- **Never:** A default that costs the visitor money or consent they did not give.

## Price

### price/anchoring

- **Evidence:** mixed
- **Means:** A first number shapes how later numbers feel, so showing the full or larger option first can make the next one look reasonable.
- **Apply:** Order offers so the reference comes first, only when the brief has real prices for both.
- **Constraint:** Prices are the customer's facts and are never changed, rounded or invented.
- **Never:** A fake "was" price, a struck-through price that was never charged, or an invented anchor. The report warns about discount claims and, for the EU, the 30-day lowest-price rule.

### price/framing

- **Evidence:** mixed
- **Means:** The same price can read lighter when shown with what it covers or per unit of use ("per month" for something used monthly).
- **Apply:** State the real price next to what it includes. A per-unit view is allowed when it is plain arithmetic of the brief's price and unit.
- **Constraint:** The main price is shown as the brief gives it; derived figures are labeled as derived.
- **Never:** Hiding the total, or a per-day figure that hides a long commitment.

### price/round-vs-exact

- **Evidence:** weak
- **Means:** Claims that round prices feel premium or that exact prices feel credible come from small studies that disagree.
- **Apply:** Do nothing on the page. If the owner is curious, it is a note for the customer, not a build decision.
- **Constraint:** Prices are customer facts; `brief-facts` fails a changed price.
- **Never:** Editing a price to look rounder or more exact.

### price/real-scarcity

- **Evidence:** mixed
- **Means:** Limited availability or a closing date raises attention when it is true.
- **Apply:** Only if the brief states a deadline or a limit, write it as text with a date ("until 30 November", "12 places").
- **Constraint:** The customer provides it; `copy-claims` warns about urgency wording.
- **Never:** A countdown timer, "only 3 left" that is not true, or a deadline that resets. `dark-patterns` fails a timer.

## Memory

### memory/peak-end

- **Evidence:** mixed
- **Means:** People tend to judge an experience by its most intense moment and by its end, so the last section matters.
- **Apply:** End on a strong, specific closing section that repeats the primary call to action and the benefit. Put the best proof or the clearest moment where the page peaks.
- **Constraint:** The closing section is a section of the layout; the review changes its copy emphasis and action, not the layout grammar.
- **Never:** Ending on legal text, a second competing call to action or a dead end.

### memory/serial-position

- **Evidence:** mixed
- **Means:** The first and last items in a sequence are remembered best, so the opening and the close carry more weight than the middle.
- **Apply:** Put the key promise in the hero and again, in other words, at the close. Keep the middle for detail and proof.
- **Constraint:** The Copy plan's order stays; reordering only where it allows.
- **Never:** Burying the offer or the price in the middle.

### memory/repetition

- **Evidence:** mixed
- **Means:** Seeing the same short phrase or action a few times helps recall and makes the next step familiar.
- **Apply:** Repeat the primary action's label and URL in the header, a mid-page block and the closing section.
- **Constraint:** One primary action; the same label each time.
- **Never:** Repeating so often that the page reads as a hard sell, or changing the label so the action looks different.

## Reciprocity

### reciprocity/free-resource

- **Evidence:** mixed
- **Means:** Giving something useful first can make a visitor more willing to give something back, such as contact details.
- **Apply:** Only when the customer has a real free resource (a guide, a valuation, a sample), offer it as the first step.
- **Constraint:** The resource and its terms are the customer's; the form asks for the minimum.
- **Never:** Inventing a free gift, or gating a basic fact (a price, an address) behind a form.

### reciprocity/useful-content

- **Evidence:** mixed
- **Means:** Content that helps even a visitor who does not buy (a clear explanation, a checklist) builds goodwill and trust.
- **Apply:** One short, practical block from the brief's description of the process or the audience's needs.
- **Constraint:** Facts come from the brief; no medical, legal or financial advice in a regulated niche.
- **Never:** Padding with generic tips to look helpful.

## Ethics

### ethics/honest-persuasion

- **Evidence:** strong
- **Means:** Regulators and research on manipulative design agree that tricks that exploit hurry, shame or inattention harm trust and often break consumer rules.
- **Apply:** Run `references/ethics.md` for every plan. If a tactic would embarrass the owner when explained to the visitor, drop it.
- **Constraint:** `dark-patterns` and `copy-claims` fail the worst cases; a person reads the page before publishing.
- **Never:** Using any principle in this catalog as a way to hide a cost, a condition or an easy refusal.

### ethics/equal-decline

- **Evidence:** strong
- **Means:** A visitor who says no should be able to do it without guilt.
- **Apply:** Decline links and buttons say "No, thanks" or equivalent and nothing more; a secondary action is quiet, not insulting.
- **Constraint:** `dark-patterns` fails confirmshaming in Spanish and English.
- **Never:** "No, I prefer to keep losing money" or any decline that blames the visitor.

### ethics/care-for-vulnerable-audiences

- **Evidence:** strong
- **Means:** People in worry or need (health, debt, grief) are easier to pressure and harder to forgive for it.
- **Apply:** Calm, plain language, no outcome promises, no time pressure, the legal notices the niche needs.
- **Constraint:** A regulated niche follows the regulated-niche rule of the build and `copy-claims`.
- **Never:** Fear as a motivator, or a promise of cure, income or result.
