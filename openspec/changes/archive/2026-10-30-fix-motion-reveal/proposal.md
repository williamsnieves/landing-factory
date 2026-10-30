# Proposal: fix-motion-reveal

## Why

Every revealed `[data-reveal]` block in the deployed previews of samurai and panaderia ends with the computed transform `matrix(1,0,0,1,0,32)`: it stays 32 px low for good.

- `src/styles/global.css` hides reveal elements under `.js-motion [data-reveal] { opacity: 0; transform: translate3d(0, 2rem, 0); }`.
- The reveal tween in `src/components/motion/index.ts` ends with `clearProps: 'transform'`. Clearing the inline transform hands the element back to that stylesheet rule, so the start offset applies again (opacity stays 1 inline).
- QA missed it: its reduced-motion and no-JavaScript loads never apply `.js-motion`, and no check looks at the end state on a motion-enabled load.

The fix (an inline `transform: none` in `onComplete`) was proven in `sites/casavela` on another branch.

## What changes

- The reveal tween in the starter and in every site copy of the motion layer ends with `onComplete` setting `el.style.transform = 'none'` instead of `clearProps: 'transform'`. This is a cross-site fix of the copied motion layer, the one case where a change touches several site folders.
- New QA check `reveal-end-state`: on the motion-enabled 1440 px load, after scrolling through the page, every visible `[data-reveal]` must be opaque and have no transform offset beyond 1 px. `--skip reveal-end-state` skips it.
- A fixture pair and a test prove the check fails on a shifted reveal and passes on a settled one.
- `CLAUDE.md` ("QA loop", "Reading report.json") documents the check.

## Exported repositories

`personal-brand` is exported: its own repository gets the fix afterwards through `scripts/sync-export.mjs` (the factory is the source of truth for managed landings). The factory copy is fixed here.

## Impact

Specs: `motion-system` (modified), `quality-gates` (added). No thresholds change.
