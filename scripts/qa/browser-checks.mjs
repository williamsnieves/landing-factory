// Functions below run INSIDE the page (via page.evaluate), so each one must be
// fully self-contained: no imports, no references to module scope.

/**
 * Horizontal overflow and clipped text. Elements (or ancestors) carrying
 * `data-qa-allow-clip` are exempt from the clipped-text rules.
 * @returns {{ viewportWidth: number, documentScrollWidth: number, documentOverflow: boolean,
 *   overflowing: Array<object>, clipped: Array<object> }}
 */
export function measureLayout() {
  const vw = window.innerWidth;
  const root = document.documentElement;
  const documentScrollWidth = Math.max(
    root.scrollWidth,
    document.body.scrollWidth,
  );

  const selectorOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== root; n = n.parentElement) {
      if (
        n.id &&
        document.querySelectorAll(`#${CSS.escape(n.id)}`).length === 1
      ) {
        parts.unshift(`#${CSS.escape(n.id)}`);
        break;
      }
      const simple = [...n.classList]
        .filter((c) => /^[A-Za-z_][\w-]*$/.test(c))
        .slice(0, 2);
      let nth = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling)
        if (s.localName === n.localName) nth++;
      parts.unshift(
        `${n.localName}${simple.map((c) => `.${c}`).join('')}:nth-of-type(${nth})`,
      );
    }
    return parts.join(' > ');
  };

  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      el.checkVisibility({ checkVisibilityCSS: true })
    );
  };
  const clips = (value) => value === 'hidden' || value === 'clip';
  const scrolls = (value) =>
    clips(value) || value === 'auto' || value === 'scroll';
  const isRootish = (el) => el === document.body || el === root;
  const allowClip = (el) => el.closest('[data-qa-allow-clip]') !== null;
  const hasOwnText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const snippet = (el) =>
    (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

  const skipTags = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'HEAD',
    'META',
    'LINK',
    'TITLE',
    'BR',
  ]);
  const all = [...document.body.querySelectorAll('*')].filter(
    (el) =>
      !skipTags.has(el.tagName) &&
      !(el instanceof SVGElement && el.ownerSVGElement),
  );

  // 1. Elements that stick out past the viewport on the right and are not
  //    contained by a clipping/scrolling ancestor or removed from the flow (fixed).
  const stickingOut = [];
  for (const el of all) {
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right <= vw + 0.5) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    let contained = false;
    for (let a = el.parentElement; a && !isRootish(a); a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.position === 'fixed' || scrolls(cs.overflowX)) {
        contained = true;
        break;
      }
    }
    if (!contained) stickingOut.push(el);
  }
  const outermost = stickingOut.filter(
    (el) => !stickingOut.some((other) => other !== el && other.contains(el)),
  );
  const overflowing = outermost.slice(0, 10).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      selector: selectorOf(el),
      width: Math.round(r.width),
      right: Math.round(r.right),
      viewportWidth: vw,
      text: snippet(el),
    };
  });

  // 2. Visible text that is clipped, either by its own overflow or by a clipping ancestor.
  const clipped = [];
  for (const el of all) {
    if (!hasOwnText(el) || allowClip(el) || !isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let reason = null;
    if (
      clips(cs.overflowX) &&
      el.clientWidth > 0 &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      reason = {
        kind: 'own-overflow-x',
        width: el.clientWidth,
        contentWidth: el.scrollWidth,
      };
    } else if (
      clips(cs.overflowY) &&
      el.clientHeight > 0 &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      reason = {
        kind: 'own-overflow-y',
        width: el.clientWidth,
        contentWidth: el.scrollWidth,
        height: el.clientHeight,
        contentHeight: el.scrollHeight,
      };
    } else {
      for (let a = el.parentElement; a && !isRootish(a); a = a.parentElement) {
        if (!clips(getComputedStyle(a).overflowX)) continue;
        const ar = a.getBoundingClientRect();
        if (r.right > ar.right + 1 || r.left < ar.left - 1) {
          reason = {
            kind: 'clipped-by-ancestor',
            width: Math.round(r.width),
            container: selectorOf(a),
            containerWidth: Math.round(ar.width),
          };
          break;
        }
      }
    }
    if (reason)
      clipped.push({ selector: selectorOf(el), text: snippet(el), ...reason });
  }

  return {
    viewportWidth: vw,
    documentScrollWidth,
    documentOverflow: documentScrollWidth > vw,
    overflowing,
    clipped: clipped.slice(0, 20),
  };
}

/**
 * Reduced-motion state: animatable content visible, no Lenis, no ScrollTrigger pin.
 * Effective opacity multiplies the opacity of the element and all its ancestors.
 */
export function measureReducedMotion() {
  const root = document.documentElement;
  const selectorOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== root; n = n.parentElement) {
      if (
        n.id &&
        document.querySelectorAll(`#${CSS.escape(n.id)}`).length === 1
      ) {
        parts.unshift(`#${CSS.escape(n.id)}`);
        break;
      }
      let nth = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling)
        if (s.localName === n.localName) nth++;
      parts.unshift(`${n.localName}:nth-of-type(${nth})`);
    }
    return parts.join(' > ');
  };
  const effectiveOpacity = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement)
      o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  };

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  const hiddenReveals = reveals
    .map((el) => ({
      selector: selectorOf(el),
      opacity: Number(effectiveOpacity(el).toFixed(3)),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
    }))
    .filter((r) => !(r.opacity > 0));

  return {
    revealCount: reveals.length,
    hiddenReveals,
    lenisClasses: [...root.classList].filter(
      (c) => c === 'lenis' || c.startsWith('lenis-'),
    ),
    pinSpacers: [...document.querySelectorAll('.pin-spacer')].map(selectorOf),
    jsMotionClass: root.classList.contains('js-motion'),
  };
}

/**
 * Reveal end state on a motion-enabled load, after the page was scrolled through:
 * every visible `[data-reveal]` must have settled at its layout position, that is
 * opaque (>= 0.99) and with no transform offset beyond 1px. A leftover stylesheet
 * offset (for example the `.js-motion [data-reveal]` start transform coming back when
 * a tween clears its inline transform) is caught here. Polls up to `timeoutMs` for
 * running reveals to finish, then reports what is still off.
 * @param {number} timeoutMs
 * @returns {Promise<{ revealCount: number, offenders: Array<object> }>}
 */
export async function measureRevealEndState(timeoutMs) {
  const root = document.documentElement;
  const selectorOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== root; n = n.parentElement) {
      if (
        n.id &&
        document.querySelectorAll(`#${CSS.escape(n.id)}`).length === 1
      ) {
        parts.unshift(`#${CSS.escape(n.id)}`);
        break;
      }
      let nth = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling)
        if (s.localName === n.localName) nth++;
      parts.unshift(`${n.localName}:nth-of-type(${nth})`);
    }
    return parts.join(' > ');
  };
  const scan = () => {
    // Elements that are not rendered never get their trigger, so they are not judged.
    const reveals = [...document.querySelectorAll('[data-reveal]')].filter(
      (el) => el.checkVisibility(),
    );
    const offenders = [];
    for (const el of reveals) {
      const cs = getComputedStyle(el);
      const opacity = parseFloat(cs.opacity);
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!(opacity >= 0.99)) {
        offenders.push({
          selector: selectorOf(el),
          metric: 'opacity',
          measured: Number(opacity.toFixed(3)),
          text: text.slice(0, 60),
        });
        continue;
      }
      const m = new DOMMatrix(
        cs.transform === 'none' ? undefined : cs.transform,
      );
      if (Math.abs(m.m41) > 1 || Math.abs(m.m42) > 1) {
        offenders.push({
          selector: selectorOf(el),
          metric: 'transform',
          measured: cs.transform,
          text: text.slice(0, 60),
        });
      }
    }
    return { revealCount: reveals.length, offenders };
  };
  const deadline = Date.now() + timeoutMs;
  let result = scan();
  while (result.offenders.length && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    result = scan();
  }
  return result;
}
