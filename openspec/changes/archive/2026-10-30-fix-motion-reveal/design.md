# Design

## Decision 1: inline `none`, not clearing

`clearProps` removes the inline style, so the stylesheet's `.js-motion [data-reveal]` offset wins again. An inline `transform: none` overrides that rule and still leaves no transform on the element, so it creates no containing block for fixed descendants. The stylesheet rule stays, because it is what hides the element before the tween starts without a flash.

## Decision 2: check in the existing 1440 px load

`reveal-end-state` runs on the normal load that already scrolls through the page for the privacy record (1440 px, else the widest viewport). In the page it polls up to 4 s for running reveals to finish, then judges every `[data-reveal]` that is rendered (`checkVisibility()`; a hidden element never gets its trigger). Opacity must be >= 0.99 and the computed transform `none` or a matrix with |translateX| and |translateY| <= 1 px. Pages without reveals pass. It needs the layout check to run (it shares its page load).

## Decision 3: fixtures without GSAP

The fixtures simulate the tween with a small inline script and the same `.js-motion` CSS; the shifted one clears the inline transform, the settled one sets `none`.
