/**
 * `field`: a grid of points over the factory floor whose height ripples like a
 * sound wave. `progress` (0..1, the scroll of the section) raises the wave
 * amplitude and drifts the camera; `timeMs` runs the ripple itself.
 * Geometry is allocated once; the frame loop only writes into typed arrays.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
} from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

const COLS = 88;
const ROWS = 60;
const SPACING = 0.34;

export const create: SceneCreate = (ctx) => {
  const renderer = createRenderer(ctx, { antialias: false });
  const paper = themeColor(ctx.theme, 'paper', '#0b0e14');
  const primary = themeColor(ctx.theme, 'primary', '#c8ff2e');
  const soft = themeColor(ctx.theme, 'ink-soft', '#a9b0bf');
  renderer.setClearColor(paper, 1);

  const scene = new Scene();
  scene.fog = new Fog(paper, 9, 26);

  const camera = new PerspectiveCamera(
    60,
    ctx.width / Math.max(ctx.height, 1),
    0.1,
    60,
  );

  const count = COLS * ROWS;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  // Static x/z of each point plus its distance from the field centre line.
  const baseX = new Float32Array(count);
  const baseZ = new Float32Array(count);
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = (c - (COLS - 1) / 2) * SPACING;
      const z = 4 - r * SPACING;
      baseX[i] = x;
      baseZ[i] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
      i++;
    }
  }

  const geometry = new BufferGeometry();
  const posAttr = new BufferAttribute(positions, 3);
  const colAttr = new BufferAttribute(colors, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', colAttr);

  const material = new PointsMaterial({
    size: 0.085,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: false,
    fog: true,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  // Reused color scratch values: no per-frame allocation.
  const mix = new Color();

  function update(progress: number, timeMs: number) {
    const t = timeMs / 1000;
    const p = Math.min(Math.max(progress, 0), 1);
    const amp = 0.45 + p * 1.7;
    const speed = 1.1 + p * 1.6;

    for (let n = 0; n < count; n++) {
      const x = baseX[n];
      const z = baseZ[n];
      const radial = Math.sqrt(x * x + (z + 3) * (z + 3));
      const wave =
        Math.sin(radial * 1.15 - t * speed) * 0.7 +
        Math.sin(x * 0.9 + t * 0.6) * 0.25 +
        Math.sin(z * 1.7 - t * speed * 0.8) * 0.2;
      const h = wave * amp * Math.exp(-radial * 0.04);
      positions[n * 3 + 1] = h;
      // Low points read as ink-soft, crests burn lime.
      const k = Math.min(Math.max((h / amp + 0.6) / 1.4, 0), 1);
      const kk = k * k * k;
      mix.copy(soft).lerp(primary, kk);
      colors[n * 3] = mix.r * (0.35 + 0.65 * k);
      colors[n * 3 + 1] = mix.g * (0.35 + 0.65 * k);
      colors[n * 3 + 2] = mix.b * (0.35 + 0.65 * k);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    camera.position.set((p - 0.5) * 4, 4.4 - p * 1.6, 8.5 - p * 2.5);
    camera.lookAt(0, 0, -4 - p * 2);
    renderer.render(scene, camera);
  }

  function resize(width: number, height: number, pixelRatio: number) {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }

  return { update, resize, dispose };
};
