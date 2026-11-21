/**
 * Scene module contract. A scene is a TypeScript module in `src/scenes/<name>.ts`
 * that exports `create`. See README.md in this folder.
 */

/** Color tokens read from the page: `--color-ink` becomes `theme.ink`. */
export type SceneTheme = Record<string, string>;

export interface SceneContext {
  /** Canvas the runtime created and mounted; create the WebGLRenderer on it. */
  canvas: HTMLCanvasElement;
  /** CSS pixel size of the mount at creation. */
  width: number;
  height: number;
  /** Device pixel ratio, already capped (2, or 1.5 under 768 px wide). */
  pixelRatio: number;
  /** Site color tokens as CSS color strings (hex, rgb(), hsl()). */
  theme: SceneTheme;
  /** Name of the scene (`data-scene`). */
  name: string;
}

export interface SceneInstance {
  /**
   * Called every frame while the scene is visible. `progress` is 0..1: the scroll
   * progress of the section with `scrub`, otherwise a looping clock. `timeMs` is
   * the rAF timestamp. The scene renders here.
   */
  update(progress: number, timeMs: number): void;
  /** CSS pixel size of the mount changed (the runtime also passes the new pixel ratio). */
  resize(width: number, height: number, pixelRatio: number): void;
  /** Release geometries, materials, textures and the renderer. */
  dispose(): void;
}

export type SceneCreate = (
  ctx: SceneContext,
) => SceneInstance | Promise<SceneInstance>;

export interface SceneModule {
  create: SceneCreate;
}

export type SceneLoader = () => Promise<SceneModule>;
