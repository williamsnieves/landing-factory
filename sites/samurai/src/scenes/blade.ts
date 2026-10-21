/**
 * Chapter III scene: a schematic katana built from geometry (curved blade with
 * a hamon band, habaki, tsuba, tsuka with a diamond wrap). The sword turns and
 * the camera moves in with the scroll progress of the section. It is a
 * simplified drawing, not a real object. Colors come from the site tokens.
 * Low poly, no per-frame allocation, one WebGLRenderer.
 */
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Shape,
} from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

const FOV = 32;
const BLADE_LENGTH = 4.2;
const BLADE_BEND = 0.5;
const TILT = -0.5;

/** Center line of the blade: leans toward +x, the side of the edge. */
const bend = (s: number) => BLADE_BEND * (s / BLADE_LENGTH) ** 2;
/** Blade width along its length: slightly narrower toward the tip. */
const width = (s: number) => 0.46 - 0.16 * (s / BLADE_LENGTH);

function bladeGeometry(depth: number): ExtrudeGeometry {
  const steps = 24;
  const top = 0.95 * BLADE_LENGTH;
  const shape = new Shape();
  shape.moveTo(bend(0) - width(0) / 2, 0);
  for (let i = 1; i <= steps; i++) {
    const s = (i / steps) * top;
    shape.lineTo(bend(s) - width(s) / 2, s);
  }
  // Tip (kissaki): the back edge meets the cutting edge in one point.
  shape.lineTo(bend(BLADE_LENGTH) + 0.04, BLADE_LENGTH);
  for (let i = steps; i >= 0; i--) {
    const s = (i / steps) * top;
    shape.lineTo(bend(s) + width(s) / 2, s);
  }
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** The hardened edge band (hamon): a wavy strip along the cutting edge. */
function hamonGeometry(depth: number): ExtrudeGeometry {
  const steps = 40;
  const from = 0.04 * BLADE_LENGTH;
  const to = 0.93 * BLADE_LENGTH;
  const edge = (s: number) => bend(s) + width(s) / 2;
  const inner = (s: number) =>
    edge(s) - width(s) * (0.3 + 0.09 * Math.sin(s * 6.5));
  const shape = new Shape();
  shape.moveTo(inner(from), from);
  for (let i = 1; i <= steps; i++) {
    const s = from + (i / steps) * (to - from);
    shape.lineTo(inner(s), s);
  }
  for (let i = steps; i >= 0; i--) {
    const s = from + (i / steps) * (to - from);
    shape.lineTo(edge(s), s);
  }
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

export const create: SceneCreate = (ctx) => {
  const renderer = createRenderer(ctx, { antialias: true });
  renderer.setClearColor(themeColor(ctx.theme, 'paper', '#0e0c0b'), 1);

  const ink = themeColor(ctx.theme, 'ink', '#f1eadc');
  const inkSoft = themeColor(ctx.theme, 'ink-soft', '#b5aa98');
  const line = themeColor(ctx.theme, 'line', '#3a322b');
  const accent = themeColor(ctx.theme, 'accent', '#bc351f');
  const primary = themeColor(ctx.theme, 'primary', '#e5543a');
  const steel = inkSoft.clone().lerp(ink, 0.15);

  const geometries: BufferGeometry[] = [];
  const track = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const steelMat = new MeshStandardMaterial({
    color: steel,
    metalness: 0.35,
    roughness: 0.35,
  });
  const hamonMat = new MeshStandardMaterial({
    color: ink,
    metalness: 0.2,
    roughness: 0.25,
    emissive: ink,
    emissiveIntensity: 0.14,
  });
  const fittingMat = new MeshStandardMaterial({
    color: accent,
    metalness: 0.2,
    roughness: 0.5,
  });
  const guardMat = new MeshStandardMaterial({
    color: inkSoft.clone().multiplyScalar(0.4),
    metalness: 0.3,
    roughness: 0.55,
  });
  const gripMat = new MeshStandardMaterial({
    color: line,
    metalness: 0,
    roughness: 0.8,
  });
  const wrapMat = new MeshStandardMaterial({
    color: primary,
    metalness: 0,
    roughness: 0.6,
  });
  const materials = [
    steelMat,
    hamonMat,
    fittingMat,
    guardMat,
    gripMat,
    wrapMat,
  ];

  const sword = new Group();

  const blade = new Mesh(track(bladeGeometry(0.08)), steelMat);
  blade.position.y = 0.05;
  sword.add(blade);
  const hamon = new Mesh(track(hamonGeometry(0.088)), hamonMat);
  hamon.position.y = 0.05;
  sword.add(hamon);

  const habaki = new Mesh(track(new BoxGeometry(0.54, 0.34, 0.15)), fittingMat);
  habaki.position.y = 0.2;
  sword.add(habaki);

  const tsuba = new Mesh(
    track(new CylinderGeometry(0.62, 0.62, 0.07, 28)),
    guardMat,
  );
  tsuba.scale.z = 0.9;
  sword.add(tsuba);

  // Tsuka (grip): an oval, a collar and a cap, with a diamond wrap on both faces.
  const grip = new Mesh(
    track(new CylinderGeometry(0.17, 0.2, 1.85, 12)),
    gripMat,
  );
  grip.scale.z = 0.72;
  grip.position.y = -0.98;
  sword.add(grip);
  const collar = new Mesh(
    track(new CylinderGeometry(0.21, 0.21, 0.12, 12)),
    fittingMat,
  );
  collar.scale.z = 0.72;
  collar.position.y = -0.1;
  sword.add(collar);
  const cap = new Mesh(
    track(new CylinderGeometry(0.22, 0.22, 0.12, 12)),
    fittingMat,
  );
  cap.scale.z = 0.72;
  cap.position.y = -1.96;
  sword.add(cap);

  const diamonds = 6;
  const wrap = new InstancedMesh(
    track(new BoxGeometry(0.15, 0.15, 0.02)),
    wrapMat,
    diamonds * 2,
  );
  const dummy = new Object3D();
  for (let i = 0; i < diamonds; i++) {
    const y = -0.4 - i * 0.26;
    // The grip is slightly tapered: widen the offset toward the cap.
    const z = (0.18 + (i / diamonds) * 0.02) * 0.72 + 0.004;
    for (let side = 0; side < 2; side++) {
      dummy.position.set(0, y, side === 0 ? z : -z);
      dummy.rotation.set(0, 0, Math.PI / 4);
      dummy.updateMatrix();
      wrap.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  wrap.instanceMatrix.needsUpdate = true;
  sword.add(wrap);

  // Center the sword (about -2 to 4.3 in y) on the origin and tilt it.
  sword.position.y = -1.15;
  const root = new Group();
  root.rotation.z = TILT;
  root.add(sword);

  const scene = new Scene();
  scene.add(root);
  scene.add(new AmbientLight(ink, 0.45));
  const key = new DirectionalLight(ink, 2.6);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new DirectionalLight(accent, 0.9);
  rim.position.set(-6, -1, -5);
  scene.add(rim);

  const camera = new PerspectiveCamera(FOV, ctx.width / ctx.height, 0.1, 60);
  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  let aspect = ctx.width / ctx.height;
  let current = -1;

  const place = (p: number) => {
    // Distance that fits the whole tilted sword, then moves in with the scroll.
    const fit = Math.max(3.4 / tanHalf, 2.4 / (aspect * tanHalf));
    const dist = fit * (1.12 - 0.42 * p);
    camera.position.set(0, 0.9 - 1.1 * p, dist);
    camera.lookAt(0, 0.35 * p, 0);
    sword.rotation.y = -0.1 + p * Math.PI * 1.7;
  };

  return {
    update(progress) {
      const target = Math.min(1, Math.max(0, progress));
      // A little easing so scrubbing never looks jittery; the first frame snaps.
      current = current < 0 ? target : current + (target - current) * 0.14;
      place(current);
      renderer.render(scene, camera);
    },
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      wrap.dispose();
      renderer.dispose();
    },
  };
};
