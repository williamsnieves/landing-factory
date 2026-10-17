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

## Accessibility and fallbacks

- Under `prefers-reduced-motion: reduce`: no Lenis, no pin, no parallax; reveal elements are shown in their final state.
- Without JavaScript: the hidden initial state of `[data-reveal]` only exists under the `.js-motion` class on `<html>`, which an inline script adds when JS runs and reduced motion is not requested. Content is visible otherwise.

## Programmatic use and cleanup

```ts
import { initMotion } from './index';

const motion = await initMotion({ smooth: true });
motion.destroy(); // kills ScrollTriggers, matchMedia and Lenis
```

`<Motion />` calls `destroy()` on `astro:before-swap` and re-initializes on `astro:page-load` when view transitions (`<ClientRouter />`) are used.
