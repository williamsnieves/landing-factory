/**
 * Deterministic dot generation for the SVG art (closing dot field, community cluster). Runs at build time in the
 * components' frontmatter: the same seed always gives the same drawing, so the HTML is stable between builds.
 */

export interface Dot {
  x: number;
  y: number;
  r: number;
}

/** mulberry32: a small seeded PRNG returning floats in [0, 1). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Gaussian-ish offset from the sum of three uniforms (cheap, bounded). */
const spread = (random: () => number) =>
  (random() + random() + random() - 1.5) / 1.5;

export interface Cluster {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count: number;
}

export function clusterDots(
  random: () => number,
  cluster: Cluster,
  radius: [number, number],
): Dot[] {
  return Array.from({ length: cluster.count }, () => ({
    x: round(cluster.cx + spread(random) * cluster.rx),
    y: round(cluster.cy + spread(random) * cluster.ry),
    r: round(radius[0] + random() * (radius[1] - radius[0])),
  }));
}

export interface Arc {
  cx: number;
  cy: number;
  radius: number;
  from: number;
  to: number;
  count: number;
  jitter: number;
}

/** Dots along a circular arc (angles in radians), slightly jittered. */
export function arcDots(
  random: () => number,
  arc: Arc,
  radius: [number, number],
): Dot[] {
  return Array.from({ length: arc.count }, (_, index) => {
    const t = arc.from + ((arc.to - arc.from) * index) / (arc.count - 1);
    const offset = spread(random) * arc.jitter;
    return {
      x: round(arc.cx + Math.cos(t) * (arc.radius + offset)),
      y: round(arc.cy + Math.sin(t) * (arc.radius + offset)),
      r: round(radius[0] + random() * (radius[1] - radius[0])),
    };
  });
}
