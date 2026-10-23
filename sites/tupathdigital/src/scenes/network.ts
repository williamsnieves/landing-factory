/**
 * "network": a few hundred linked points that form a winding path, the brand
 * idea of tupathdigital. Scrolling the hero draws the path further along.
 * Colors come from the page tokens (primary, accent, ink, paper). Code only.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
} from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

const PATH_NODES = 240;
const DUST_NODES = 70;
const TOTAL = PATH_NODES + DUST_NODES;
const LINK_RADIUS = 1.35;

/** Deterministic pseudo-random in [0, 1) so the poster matches the scene. */
const rand = (i: number, n: number) => {
  const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const create: SceneCreate = (ctx) => {
  const primary = themeColor(ctx.theme, 'primary', '#1881d4');
  const accent = themeColor(ctx.theme, 'accent', '#5cb8ff');
  const ink = themeColor(ctx.theme, 'ink', '#eaf2fb');
  const paper = themeColor(ctx.theme, 'paper', '#060b14');

  const renderer = createRenderer(ctx);
  renderer.setClearColor(paper, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, ctx.width / ctx.height, 0.1, 60);
  camera.position.set(0, 0, 10.5);

  const world = new Group();
  scene.add(world);

  // Node positions: a winding path plus loose dust around it.
  const pos = new Float32Array(TOTAL * 3);
  for (let i = 0; i < PATH_NODES; i++) {
    const t = i / (PATH_NODES - 1);
    const a = t * Math.PI * 2 * 1.6;
    pos[i * 3] = (t - 0.5) * 6.6 + (rand(i, 1) - 0.5) * 0.7;
    pos[i * 3 + 1] = Math.sin(a) * 1.7 + (rand(i, 2) - 0.5) * 0.7;
    pos[i * 3 + 2] = Math.cos(a * 0.8) * 1.8 + (rand(i, 3) - 0.5) * 0.7;
  }
  for (let k = 0; k < DUST_NODES; k++) {
    const i = PATH_NODES + k;
    pos[i * 3] = (rand(i, 4) - 0.5) * 9;
    pos[i * 3 + 1] = (rand(i, 5) - 0.5) * 6.2;
    pos[i * 3 + 2] = (rand(i, 6) - 0.5) * 5;
  }

  // Links between path neighbours, ordered by their later node so that a
  // draw range reveals the path from its start.
  const linkList: number[] = [];
  for (let i = 1; i < PATH_NODES; i++) {
    linkList.push(i - 1, i);
    let extra = 0;
    for (let j = i - 2; j >= Math.max(0, i - 9) && extra < 2; j--) {
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < LINK_RADIUS * LINK_RADIUS) {
        linkList.push(j, i);
        extra++;
      }
    }
  }
  const linkCount = linkList.length / 2;
  const linePositions = new Float32Array(linkList.length * 3);
  for (let l = 0; l < linkList.length; l++) {
    const n = linkList[l];
    linePositions[l * 3] = pos[n * 3];
    linePositions[l * 3 + 1] = pos[n * 3 + 1];
    linePositions[l * 3 + 2] = pos[n * 3 + 2];
  }
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(linePositions, 3));
  const lineMaterial = new LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.6,
  });
  const lines = new LineSegments(lineGeometry, lineMaterial);
  world.add(lines);

  // Nodes: one instanced mesh.
  const nodeGeometry = new IcosahedronGeometry(0.07, 0);
  const nodeMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const nodes = new InstancedMesh(nodeGeometry, nodeMaterial, TOTAL);
  const tint = new Color();
  for (let i = 0; i < TOTAL; i++) {
    if (i >= PATH_NODES) tint.copy(primary).lerp(paper, 0.45);
    else if (i % 11 === 0) tint.copy(ink);
    else tint.copy(primary).lerp(accent, i / PATH_NODES);
    nodes.setColorAt(i, tint);
  }
  world.add(nodes);

  // The head of the path: a larger point where the line is being drawn.
  const headGeometry = new IcosahedronGeometry(0.2, 1);
  const headMaterial = new MeshBasicMaterial({ color: accent });
  const head = new Mesh(headGeometry, headMaterial);
  world.add(head);

  const dummy = new Object3D();
  let smooth = -1;
  let last = 0;

  const update = (progress: number, timeMs: number) => {
    const dt = last ? Math.min(0.05, (timeMs - last) / 1000) : 0;
    last = timeMs;
    smooth =
      smooth < 0 || !dt
        ? progress
        : smooth + (progress - smooth) * (1 - Math.exp(-dt * 5));

    const s = MathUtils.clamp((smooth - 0.5) / 0.5, 0, 1);
    const reveal = 0.55 + 0.45 * s;
    const shown = Math.floor(PATH_NODES * reveal);
    const t = timeMs / 1000;

    world.position.x = 1.2 * (1 - s);
    world.rotation.y = -0.55 + smooth * 1.5 + Math.sin(t * 0.15) * 0.06;
    world.rotation.x = 0.18 - smooth * 0.12;

    for (let i = 0; i < TOTAL; i++) {
      const on = i >= PATH_NODES || i < shown;
      const pulse = 1 + 0.25 * Math.sin(t * 1.6 + i * 0.7);
      const scale = on ? (i >= PATH_NODES ? 0.7 : pulse) : 0;
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);
    }
    nodes.instanceMatrix.needsUpdate = true;

    const headIndex = Math.max(0, shown - 1);
    head.position.set(
      pos[headIndex * 3],
      pos[headIndex * 3 + 1],
      pos[headIndex * 3 + 2],
    );
    head.scale.setScalar(1 + 0.2 * Math.sin(t * 3));

    lineGeometry.setDrawRange(0, Math.floor(linkCount * reveal) * 2);
    renderer.render(scene, camera);
  };

  const resize = (width: number, height: number, pixelRatio: number) => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width / height < 0.8 ? 14 : 10.5;
    camera.updateProjectionMatrix();
  };
  resize(ctx.width, ctx.height, ctx.pixelRatio);

  const dispose = () => {
    lineGeometry.dispose();
    lineMaterial.dispose();
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    nodes.dispose();
    headGeometry.dispose();
    headMaterial.dispose();
    renderer.dispose();
  };

  return { update, resize, dispose };
};
