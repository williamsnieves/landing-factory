# Design

## Context

See `proposal.md` — Why. `recon.mjs` measures `document.documentElement.scrollHeight` and scrolls with `window.scrollTo`. On container-scrolled pages the document height equals the viewport, so it takes one screen and samples no motion.

## Goals / Non-Goals

**Goals:** cover container-scrolled pages; make the scripts work behind the cloud proxy with no flags.

**Non-Goals:** nested or horizontal scrollers, scroll-jacked canvases (WebGL scenes driven by wheel events with no scrollable element).

## Decisions

1. **Scroller detection (in page):** if `documentElement.scrollHeight <= innerHeight * 1.1`, pick the element with the largest `scrollHeight - clientHeight` among elements whose computed `overflow-y` is `auto|scroll|overlay`, that are visible, and whose client box covers at least 60% of the viewport area. Fall back to the document when none qualifies.
2. **Abstraction:** a single helper `scrollToY(y)` and `getScrollY()` evaluated in page against the chosen scroller (`el.scrollTop = y` or `window.scrollTo`), used by the screenshot pass, motion sampling and the wheel/inertia probe (wheel events dispatched over the scroller's center). Motion observations keep using the scroller position as `scrollY`.
3. **Recon output:** `scroller: { kind: "document" | "container", scrollHeightPx, clientHeightPx }`, and `viewports[w].docHeightPx` reports the scrollable height actually used.
4. **Proxy:** Node 22 reads `NODE_USE_ENV_PROXY` only at startup, so each CLI entry point checks at start: if `HTTPS_PROXY`/`HTTP_PROXY` is set and `NODE_USE_ENV_PROXY` is not, it re-executes itself once with `NODE_USE_ENV_PROXY=1` (guarded by an env marker to avoid loops), passing argv, stdio and exit code through. Imported functions (tests) are unaffected. Chromium gets the proxy through Playwright's launch `proxy: { server }` option when the variable is set. CA certificates come from the environment (`NODE_EXTRA_CA_CERTS`) as today; the scripts never read or embed certificates themselves.

## Risks / Trade-offs

- [Heuristic picks a side panel or modal] → the 60% area rule and "largest scroll range" make that unlikely; recorded in output for review.
- [Experimental Node proxy agent warning noise] → suppress only that specific warning in the CLI output.
