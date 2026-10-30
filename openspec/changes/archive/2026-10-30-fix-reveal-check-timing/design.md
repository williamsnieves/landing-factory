# Design

## Decision 1: fix the harness, not the site

The motion layer behaves correctly for a visitor who scrolls after init. QA must give it the same chance: wait for the network to go idle (bounded, a page that never idles does not stall QA), then scroll.

## Decision 2: re-scroll inside the poll

Network idle does not guarantee `initMotion` ran, so the poll loop in `measureRevealEndState` scrolls through the page in 0.8 viewport steps (100 ms each), returns to the top, waits 200 ms and scans again, until no offender is left or the 8 s deadline passes. Scrolling cannot remove a leftover transform offset, so a shifted end state still fails. `scan()` and the failure shape are unchanged.

## Decision 3: late-init fixture

`reveal-late` stands in for the motion layer without GSAP: after `load` plus 2 s it arms an IntersectionObserver that reveals elements once, when they come into view. Under the old harness the reveals below the first viewport stay at opacity 0.
