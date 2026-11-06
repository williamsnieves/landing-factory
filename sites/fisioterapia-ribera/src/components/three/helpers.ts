/**
 * Small helpers for scene modules. They import from `three` by name, so only
 * what a scene uses ends up in the 3D chunk.
 */
import { Color, WebGLRenderer } from 'three';
import type { SceneContext } from './types';

/** Renderer on the runtime's canvas, sized and capped to the context. */
export function createRenderer(
  ctx: Pick<SceneContext, 'canvas' | 'width' | 'height' | 'pixelRatio'>,
  options: { alpha?: boolean; antialias?: boolean } = {},
): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas: ctx.canvas,
    antialias: options.antialias ?? true,
    alpha: options.alpha ?? false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(ctx.pixelRatio);
  renderer.setSize(ctx.width, ctx.height, false);
  return renderer;
}

/** A theme token as a THREE.Color, with a fallback when the token is missing or unparsable. */
export function themeColor(
  theme: SceneContext['theme'],
  name: string,
  fallback = '#808080',
): Color {
  const color = new Color();
  try {
    color.set(theme[name] ?? fallback);
  } catch {
    color.set(fallback);
  }
  return color;
}
