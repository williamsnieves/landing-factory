/**
 * Pure helpers of the 3D runtime: no DOM access at import time, so they can be
 * unit tested in Node.
 */

export type SceneSkipReason = 'reduced-motion' | 'no-webgl';

export interface GateInput {
  reducedMotion: boolean;
  webgl: boolean;
}

/** `null` means the scene may run; otherwise the reason it stays a poster. */
export function sceneSkipReason(input: GateInput): SceneSkipReason | null {
  if (input.reducedMotion) return 'reduced-motion';
  if (!input.webgl) return 'no-webgl';
  return null;
}

/** Pixel ratio cap: 2 on large screens, 1.5 under 768 px wide. */
export function cappedPixelRatio(devicePixelRatio: number, width: number) {
  const cap = width < 768 ? 1.5 : 2;
  return Math.max(1, Math.min(devicePixelRatio || 1, cap));
}

/** Scene name from a glob key such as `/src/scenes/demo.ts`. */
export function sceneNameFromPath(path: string): string | null {
  const match = /(?:^|\/)([^/]+)\.(?:ts|js)$/.exec(path);
  return match ? match[1] : null;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Scroll progress of a section: 0 when its top enters at the bottom of the
 * viewport, 1 when its bottom leaves at the top (ScrollTrigger's default
 * `top bottom` to `bottom top`).
 */
export function scrollProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
) {
  const total = viewportHeight + rect.height;
  return total > 0 ? clamp01((viewportHeight - rect.top) / total) : 0;
}

/** Looping clock for scenes without scrub: 0..1 every `seconds`. */
export function loopProgress(elapsedMs: number, seconds: number) {
  const period = Math.max(0.1, seconds) * 1000;
  return (elapsedMs % period) / period;
}

/**
 * A WebGL context that cannot be created is an environment limit (warn and keep
 * the poster). Anything else thrown by a scene is a bug (error).
 */
export function isWebGLUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /error creating webgl context|webgl.*(not supported|unavailable|not available)|could not create.*webgl/i.test(
    message,
  );
}
