/**
 * Hero scene: a few hundred particles drifting slowly, like ink spreading in
 * water. Built from code only (points + a tiny soft-dot shader), colors read
 * from the site tokens. Loops on time; no per-frame allocation.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
} from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

const COUNT = 640;
const PLUMES = 6;
const FOV = 40;

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * 0.5;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

/** Deterministic pseudo-random numbers so the poster and the canvas match. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const create: SceneCreate = (ctx) => {
  const renderer = createRenderer(ctx, { antialias: false });
  const paper = themeColor(ctx.theme, 'paper', '#0e0c0b');
  renderer.setClearColor(paper, 1);

  const inkSoft = themeColor(ctx.theme, 'ink-soft', '#b5aa98');
  const accent = themeColor(ctx.theme, 'accent', '#bc351f');
  const primary = themeColor(ctx.theme, 'primary', '#e5543a');

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, ctx.width / ctx.height, 0.1, 60);
  camera.position.set(0, 0, 14);

  const rand = mulberry32(1185);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  // Per-particle state: plume index, offset from the plume center, swirl speed, phase.
  const plume = new Uint8Array(COUNT);
  const off = new Float32Array(COUNT * 3);
  const swirl = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  const tint = new Color();

  for (let i = 0; i < COUNT; i++) {
    plume[i] = Math.floor(rand() * PLUMES);
    // Ink clouds are dense in the middle and thin out: radius skewed to the center.
    const r = Math.pow(rand(), 1.6) * 4.2;
    const theta = rand() * Math.PI * 2;
    off[i * 3] = Math.cos(theta) * r * 1.35;
    off[i * 3 + 1] = Math.sin(theta) * r * 0.8;
    off[i * 3 + 2] = (rand() - 0.5) * 5;
    swirl[i] = (0.02 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1);
    phase[i] = rand() * Math.PI * 2;

    const roll = rand();
    // Mostly pale ink in water, some deep shu, a few bright shu sparks.
    if (roll < 0.62) tint.copy(inkSoft).multiplyScalar(0.55);
    else if (roll < 0.92) tint.copy(accent);
    else tint.copy(primary);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
    sizes[i] = 0.35 + rand() * rand() * 1.6;
  }

  const geometry = new BufferGeometry();
  const positionAttr = new BufferAttribute(positions, 3);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  // Positions change every frame inside a known box: skip bounds computation.
  geometry.boundingSphere = null;

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uScale: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const setScale = (height: number, pixelRatio: number) => {
    material.uniforms.uScale.value =
      (height * pixelRatio) / (2 * Math.tan((FOV * Math.PI) / 360));
  };
  setScale(ctx.height, ctx.pixelRatio);

  // Plume centers wander slowly on their own sines (stored, not recreated).
  const cx = new Float32Array(PLUMES);
  const cy = new Float32Array(PLUMES);
  const cz = new Float32Array(PLUMES);

  const frame = (timeMs: number) => {
    const t = timeMs * 0.001;
    for (let k = 0; k < PLUMES; k++) {
      const s = k * 1.7 + 0.3;
      cx[k] = (k - (PLUMES - 1) / 2) * 3.4 + Math.sin(t * 0.05 + s) * 2.2;
      cy[k] = Math.sin(t * 0.04 + s * 2.1) * 1.8 + Math.cos(t * 0.03 + s) * 0.8;
      cz[k] = Math.sin(t * 0.03 + s * 0.7) * 2.5 - 1;
    }
    for (let i = 0; i < COUNT; i++) {
      const k = plume[i];
      const a = t * swirl[i] + phase[i];
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const ox = off[i * 3];
      const oy = off[i * 3 + 1];
      // Slow breathing, so the cloud swells and thins like ink in still water.
      const breathe = 1 + 0.18 * Math.sin(t * 0.12 + phase[i]);
      positions[i * 3] = cx[k] + (ox * cos - oy * sin) * breathe;
      positions[i * 3 + 1] = cy[k] + (ox * sin + oy * cos) * breathe;
      positions[i * 3 + 2] =
        cz[k] + off[i * 3 + 2] + Math.sin(t * 0.07 + phase[i]) * 0.6;
    }
    positionAttr.needsUpdate = true;
  };

  return {
    update(_progress, timeMs) {
      frame(timeMs);
      renderer.render(scene, camera);
    },
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      setScale(height, pixelRatio);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
};
