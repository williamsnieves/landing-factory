# motion

Scroll animation layer: GSAP + ScrollTrigger, with optional Lenis smooth scroll. Sections opt in with `data-*` attributes, with no animation code in the section.

## Setup per page

Add `<Motion />` to the `head` slot of the page. Pages without it never download GSAP or Lenis.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Motion from '../components/motion/Motion.astro';
---

<BaseLayout title="..." description="...">
  <Motion slot="head" smooth />
  ...
</BaseLayout>
```

`smooth` enables Lenis smooth scroll, kept in sync with ScrollTrigger through `gsap.ticker`. Omit it for native scrolling.

## Primitives

### Reveal

Fades and lifts an element into place when it enters the viewport (once).

```html
<h2 data-reveal>Title</h2>
<li data-reveal data-reveal-delay="0.15" data-reveal-y="48">Staggered card</li>
```

- `data-reveal-delay`: seconds (default `0`)
- `data-reveal-y`: start offset in px (default `32`)

### Pin

Holds a section at the top of the viewport for a scroll distance, then releases it.

```html
<section data-pin data-pin-distance="100%" data-pin-min="md">...</section>
```

- `data-pin-distance`: extra scroll distance; `100%` is one viewport height, or a px number such as `600` (default `100%`)
- `data-pin-min`: only pin from this breakpoint up: `sm` 640, `md` 768, `lg` 1024, `xl` 1280 (default: always). Use `md` to avoid pin overflow on phones.

`data-pin-steps` (site-specific addition): on a pinned element that contains `[data-step]` children, splits the pinned scroll into one slice per step and mirrors the active index in `data-step-active` (`0`, `1`, ...). CSS decides what each step shows; the markup and styles must also read fine when nothing is pinned (mobile, reduced motion, no JavaScript), where `data-step-active` stays `0` and is ignored.

### Parallax

Moves a layer by `±speed × its own height` while its parent crosses the viewport. Put it on a child of an `overflow-hidden` wrapper, and oversize it so edges never show.

```html
<div class="relative h-[60svh] overflow-hidden">
  <div data-parallax="0.2" class="absolute inset-x-0 -top-[20%] h-[140%]">
    ...
  </div>
</div>
```

- `data-parallax`: speed factor (default `0.2`)

### Marquee scrub

Translates an element sideways, scrubbed to scroll (linear), while its parent crosses the viewport. Use it for one giant word. Center the element in an `overflow-hidden` parent; the travel is symmetric around that static position, so nothing overflows the page.

```html
<div class="flex justify-center overflow-hidden">
  <p
    data-marquee-scrub
    data-marquee-direction="left"
    class="flex-none whitespace-nowrap"
  >
    MASA MADRE
  </p>
</div>
```

- `data-marquee-scrub`: total travel. Empty or `auto` (default): the distance the element overflows its parent, at least 20% of its width, so a word wider than the viewport scrolls from its first to its last letter. A number or `NN%`: percentage of the element's own width. `NNNpx`: pixels.
- `data-marquee-direction`: `left` (default, the element moves left as you scroll down) or `right`.
- Reduced motion or no JavaScript: nothing moves; the element stays in its static centered position. Give it a layout that fits the viewport in that state (for example by wrapping the words onto two lines unless `.js-motion` is on `<html>`).

## Accessibility and fallbacks

- Under `prefers-reduced-motion: reduce`: no Lenis, no pin, no parallax, no marquee scrub; reveal elements are shown in their final state.
- Without JavaScript: the hidden initial state of `[data-reveal]` only exists under the `.js-motion` class on `<html>`, which an inline script adds when JS runs and reduced motion is not requested. Content is visible otherwise.

## Programmatic use and cleanup

```ts
import { initMotion } from './index';

const motion = await initMotion({ smooth: true });
motion.destroy(); // kills ScrollTriggers, matchMedia and Lenis
```

`<Motion />` calls `destroy()` on `astro:before-swap` and re-initializes on `astro:page-load` when view transitions (`<ClientRouter />`) are used.
