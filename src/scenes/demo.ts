/**
 * Demo scene for the starter: an abstract blade (extruded, tapered curve) that
 * turns with the scroll progress, with a drift of petals. Colors come from the
 * page's tokens (ink, paper, primary, accent). Built from code only.
 */
import {
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Shape,
} from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

const PETALS = 150;

/** Tapered, slightly curved blade outline in the XY plane, tip at +Y. */
function bladeShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.16, -2.2);
  shape.lineTo(0.16, -2.2);
  shape.bezierCurveTo(0.17, -0.8, 0.19, 0.6, 0.12, 1.5);
  shape.quadraticCurveTo(0.08, 2.05, -0.02, 2.4);
  shape.quadraticCurveTo(-0.14, 1.9, -0.17, 1.1);
  shape.bezierCurveTo(-0.2, 0.2, -0.18, -1, -0.16, -2.2);
  return shape;
}

export const create: SceneCreate = (ctx) => {
  const ink = themeColor(ctx.theme, 'ink', '#14120f');
  const paper = themeColor(ctx.theme, 'paper', '#faf7f2');
  const primary = themeColor(ctx.theme, 'primary', '#c2410c');
  const accent = themeColor(ctx.theme, 'accent', '#f2b84b');

  const renderer = createRenderer(ctx);
  renderer.setClearColor(ink, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, ctx.width / ctx.height, 0.1, 50);
  camera.position.set(0, 0, 9);

  scene.add(new AmbientLight(paper, 0.9));
  const key = new DirectionalLight(paper, 3.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new PointLight(accent, 40, 14);
  rim.position.set(-3, -1, 2.5);
  scene.add(rim);

  const bladeGeometry = new ExtrudeGeometry(bladeShape(), {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 24,
  });
  bladeGeometry.center();
  const bladeMaterial = new MeshStandardMaterial({
    color: paper,
    metalness: 0.55,
    roughness: 0.3,
  });
  const blade = new Mesh(bladeGeometry, bladeMaterial);
  scene.add(blade);

  // Petals: one instanced mesh, positions advanced on the CPU each frame.
  const petalGeometry = new PlaneGeometry(0.11, 0.065);
  const petalMaterial = new MeshBasicMaterial({
    side: DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const petals = new InstancedMesh(petalGeometry, petalMaterial, PETALS);
  const seed = new Float32Array(PETALS * 4);
  const tint = new Color();
  for (let i = 0; i < PETALS; i++) {
    // Deterministic pseudo-random layout so the poster matches the scene.
    const r = (n: number) => {
      const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    seed[i * 4] = (r(1) - 0.5) * 9;
    seed[i * 4 + 1] = r(2) * 8;
    seed[i * 4 + 2] = (r(3) - 0.5) * 5 - 0.5;
    seed[i * 4 + 3] = 0.4 + r(4) * 0.9;
    petals.setColorAt(i, tint.copy(i % 3 === 0 ? accent : primary));
  }
  scene.add(petals);

  const dummy = new Object3D();
  let smooth = 0;
  let last = 0;

  const update = (progress: number, timeMs: number) => {
    const dt = last ? Math.min(0.05, (timeMs - last) / 1000) : 0;
    last = timeMs;
    smooth += (progress - smooth) * (dt ? 1 - Math.exp(-dt * 5) : 1);

    blade.rotation.set(
      MathUtils.lerp(0.15, -0.1, smooth),
      MathUtils.lerp(-0.9, 2.3, smooth),
      MathUtils.lerp(-0.55, -0.15, smooth),
    );
    camera.position.z = MathUtils.lerp(10, 7.6, smooth);

    const t = timeMs / 1000;
    for (let i = 0; i < PETALS; i++) {
      const speed = seed[i * 4 + 3];
      const fall = (seed[i * 4 + 1] - t * speed * 0.35 + 8000) % 8;
      dummy.position.set(
        seed[i * 4] + Math.sin(t * speed + i) * 0.35,
        fall - 4,
        seed[i * 4 + 2],
      );
      dummy.rotation.set(t * speed + i, t * 0.6 * speed, i);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };

  return {
    update,
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      petalGeometry.dispose();
      petalMaterial.dispose();
      petals.dispose();
      renderer.dispose();
    },
  };
};
