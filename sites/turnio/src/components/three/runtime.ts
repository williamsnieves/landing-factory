/**
 * 3D runtime: finds every `[data-scene]` figure, decides whether it may run,
 * lazy-loads its scene module (and Three.js with it) near the viewport and
 * drives the render loop. The poster stays in the DOM and is the fallback.
 */
import {
  cappedPixelRatio,
  isWebGLUnavailable,
  loopProgress,
  sceneNameFromPath,
  sceneSkipReason,
  scrollProgress,
} from './gating';
import type {
  SceneInstance,
  SceneLoader,
  SceneModule,
  SceneTheme,
} from './types';

export interface ScenesHandle {
  destroy: () => void;
}

const LOOP_SECONDS = 20;

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Every `--color-*` custom property declared in the page's stylesheets (including @layer blocks). */
function collectColorTokens(): string[] {
  const found: string[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule)
        found.push(
          ...Array.from(rule.style).filter((p) => p.startsWith('--color-')),
        );
      const nested = (rule as { cssRules?: CSSRuleList }).cssRules;
      if (nested) walk(nested);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // cross-origin sheet
    }
  }
  return found;
}

/** `--color-ink` becomes `theme.ink`; only tokens present in the CSS are returned. */
export function readTheme(
  names?: string[],
  root: Element = document.documentElement,
): SceneTheme {
  const theme: SceneTheme = {};
  const style = getComputedStyle(root);
  const tokens = names ?? collectColorTokens();
  for (const token of new Set(tokens)) {
    const prop = token.startsWith('--') ? token : `--color-${token}`;
    const value = style.getPropertyValue(prop).trim();
    if (value) theme[prop.replace(/^--color-/, '')] = value;
  }
  return theme;
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class SceneController {
  private instance?: SceneInstance;
  private canvas?: HTMLCanvasElement;
  private loadObserver?: IntersectionObserver;
  private visibleObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private frame = 0;
  private visible = false;
  private started = false;
  private destroyed = false;
  private t0 = 0;
  private lastSize = '';

  constructor(
    private readonly el: HTMLElement,
    private readonly name: string,
    private readonly loader: SceneLoader | undefined,
  ) {}

  private get mount(): HTMLElement {
    return this.el.querySelector<HTMLElement>('[data-scene-mount]') ?? this.el;
  }

  private setState(state: string, reason?: string) {
    this.el.dataset.sceneState = state;
    if (reason) this.el.dataset.sceneReason = reason;
  }

  init() {
    const reason = sceneSkipReason({
      reducedMotion: prefersReducedMotion(),
      webgl: detectWebGL(),
    });
    if (reason) {
      this.setState('poster', reason);
      if (reason === 'no-webgl')
        console.warn(
          `[scene:${this.name}] WebGL is not available; poster kept`,
        );
      return;
    }
    if (!this.loader) {
      console.error(
        `[scene:${this.name}] no module src/scenes/${this.name}.ts; poster kept`,
      );
      this.setState('poster', 'missing-module');
      return;
    }
    this.setState('idle');
    this.loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.loadObserver?.disconnect();
          void this.whenIdle().then(() => this.start());
        }
      },
      { rootMargin: '100% 0px' },
    );
    this.loadObserver.observe(this.el);
  }

  /** Keep Three.js off the critical path: after load, then at an idle moment. */
  private async whenIdle(): Promise<void> {
    if (document.readyState !== 'complete')
      await new Promise<void>((resolve) =>
        window.addEventListener('load', () => resolve(), { once: true }),
      );
    const idle = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    await new Promise<void>((resolve) => {
      if (idle) idle(() => resolve(), { timeout: 1500 });
      else setTimeout(resolve, 200);
    });
  }

  private async start() {
    if (this.destroyed || this.started || !this.loader) return;
    this.started = true;
    this.setState('loading');
    let mod: SceneModule;
    try {
      mod = await this.loader();
    } catch (error) {
      console.error(`[scene:${this.name}] failed to load the module`, error);
      this.fallback('load-failed');
      return;
    }
    if (this.destroyed) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .7s ease';
    this.mount.appendChild(canvas);
    this.canvas = canvas;

    const { width, height } = this.size();
    try {
      this.instance = await mod.create({
        canvas,
        width,
        height,
        pixelRatio: cappedPixelRatio(
          window.devicePixelRatio,
          window.innerWidth,
        ),
        theme: readTheme(),
        name: this.name,
      });
    } catch (error) {
      if (isWebGLUnavailable(error))
        console.warn(`[scene:${this.name}] WebGL unavailable; poster kept`);
      else console.error(`[scene:${this.name}] failed to start`, error);
      this.fallback('create-failed');
      return;
    }
    if (this.destroyed) {
      this.instance.dispose();
      return;
    }

    this.t0 = performance.now();
    this.setState('running');
    requestAnimationFrame(() => {
      canvas.style.opacity = '1';
    });
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.mount);
    this.visibleObserver = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting);
      this.schedule();
    });
    this.visibleObserver.observe(this.el);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private size() {
    const rect = this.mount.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  }

  private onResize() {
    if (!this.instance) return;
    const { width, height } = this.size();
    const key = `${width}x${height}`;
    if (key === this.lastSize) return;
    this.lastSize = key;
    try {
      this.instance.resize(
        width,
        height,
        cappedPixelRatio(window.devicePixelRatio, window.innerWidth),
      );
    } catch (error) {
      this.fail(error);
    }
  }

  private onVisibility = () => this.schedule();

  private schedule() {
    const shouldRun = this.visible && !document.hidden && !!this.instance;
    if (shouldRun && !this.frame) this.frame = requestAnimationFrame(this.tick);
    else if (!shouldRun && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private progress(now: number): number {
    if (this.el.hasAttribute('data-scene-scrub')) {
      // ScrollTrigger (through <Motion />) owns the value when present.
      if (this.el.dataset.sceneScrubSource === 'scrolltrigger')
        return parseFloat(this.el.dataset.sceneProgress ?? '0') || 0;
      const section =
        this.el.closest<HTMLElement>('section') ?? (this.el as HTMLElement);
      const p = scrollProgress(
        section.getBoundingClientRect(),
        window.innerHeight,
      );
      this.el.dataset.sceneProgress = p.toFixed(4);
      return p;
    }
    return loopProgress(
      now - this.t0,
      parseFloat(this.el.dataset.sceneDuration ?? '') || LOOP_SECONDS,
    );
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.instance || !this.visible || document.hidden) return;
    try {
      this.instance.update(this.progress(now), now);
    } catch (error) {
      this.fail(error);
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private fail(error: unknown) {
    console.error(`[scene:${this.name}] runtime error`, error);
    this.fallback('runtime-error');
  }

  /** Back to the poster: remove the canvas, release the scene. */
  private fallback(reason: string) {
    this.release();
    this.setState('poster', reason);
  }

  private release() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.loadObserver?.disconnect();
    this.visibleObserver?.disconnect();
    this.resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    try {
      this.instance?.dispose();
    } catch (error) {
      console.error(`[scene:${this.name}] dispose failed`, error);
    }
    this.instance = undefined;
    this.canvas?.remove();
    this.canvas = undefined;
  }

  destroy() {
    this.destroyed = true;
    this.release();
  }
}

/**
 * Mount every `[data-scene]` in `root`. `loaders` is the `import.meta.glob` of the
 * site's `src/scenes/*.ts` (lazy, so each scene and Three.js become their own chunks).
 */
export function mountScenes(
  loaders: Record<string, SceneLoader>,
  root: ParentNode = document,
): ScenesHandle {
  const byName = new Map<string, SceneLoader>();
  for (const [path, loader] of Object.entries(loaders)) {
    const name = sceneNameFromPath(path);
    if (name) byName.set(name, loader);
  }
  const controllers = Array.from(
    root.querySelectorAll<HTMLElement>('[data-scene]'),
  ).map((el) => {
    const name = el.dataset.scene ?? '';
    const controller = new SceneController(el, name, byName.get(name));
    controller.init();
    return controller;
  });
  return { destroy: () => controllers.forEach((c) => c.destroy()) };
}
