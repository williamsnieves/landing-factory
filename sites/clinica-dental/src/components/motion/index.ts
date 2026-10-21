/**
 * Motion layer: reads data-* attributes and creates GSAP ScrollTriggers.
 * Loaded through dynamic import by <Motion />, so pages without it never
 * download GSAP or Lenis.
 */

export interface MotionOptions {
  /** Enable Lenis smooth scrolling (default false). */
  smooth?: boolean;
  /** Root element to scan for data-* attributes (default document). */
  root?: ParentNode;
}

export interface MotionInstance {
  destroy: () => void;
}

const BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const num = (value: string | undefined, fallback: number): number => {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function initMotion(
  options: MotionOptions = {},
): Promise<MotionInstance> {
  const root = options.root ?? document;
  const revealEls = Array.from(
    root.querySelectorAll<HTMLElement>('[data-reveal]'),
  );

  // Reduced motion: show everything in its final state, create nothing.
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('js-motion');
    revealEls.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return { destroy() {} };
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll (Lenis) kept in sync with ScrollTrigger through gsap.ticker.
  let teardownLenis: (() => void) | undefined;
  if (options.smooth) {
    const { default: Lenis } = await import('lenis');
    const lenis = new Lenis({ autoRaf: false });
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', onScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    teardownLenis = () => {
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
    };
  }

  const mm = gsap.matchMedia();
  const ctx = gsap.context(() => {
    // Reveal: data-reveal, optional data-reveal-delay (seconds), data-reveal-y (px)
    revealEls.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: num(el.dataset.revealY, 32) },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          delay: num(el.dataset.revealDelay, 0),
          clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      );
    });

    // Parallax: data-parallax="0.2" moves the element by +-20% of its own height.
    // Put it on a child of an overflow-hidden wrapper to avoid overflow.
    root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const speed = num(el.dataset.parallax, 0.2);
      gsap.fromTo(
        el,
        { yPercent: -speed * 100 },
        {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    });

    // Pin: data-pin, optional data-pin-distance ("100%" of viewport height, or px)
    // and data-pin-min="md" to only pin from that breakpoint up.
    root.querySelectorAll<HTMLElement>('[data-pin]').forEach((el) => {
      const minWidth = BREAKPOINTS[el.dataset.pinMin ?? ''] ?? 0;
      const distance = el.dataset.pinDistance ?? '100%';
      // data-pin-steps: split the pinned scroll into one slice per [data-step]
      // child and mirror the active index in data-step-active (CSS does the rest).
      const stepCount = el.hasAttribute('data-pin-steps')
        ? el.querySelectorAll('[data-step]').length
        : 0;
      mm.add(`(min-width: ${minWidth}px)`, () => {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: `+=${distance}`,
          pin: true,
          onUpdate: stepCount
            ? (self) =>
                el.setAttribute(
                  'data-step-active',
                  String(
                    Math.min(
                      stepCount - 1,
                      Math.floor(self.progress * stepCount),
                    ),
                  ),
                )
            : undefined,
        });
        return () => {
          trigger.kill();
          if (stepCount) el.setAttribute('data-step-active', '0');
        };
      });
    });
  }, document.documentElement);

  ScrollTrigger.refresh();

  return {
    destroy() {
      mm.revert();
      ctx.revert();
      teardownLenis?.();
    },
  };
}
