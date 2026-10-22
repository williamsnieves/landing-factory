/**
 * Original floor-plan drawings, written as data and rendered by Plan.astro.
 * Everything is drawn from code in a 480 x 360 user-unit box. No downloaded
 * drawings. Walls are thick strokes, windows triple lines, doors a leaf plus an
 * arc. Each plan carries its own scale (units per metre).
 */

export type Door = [
  hingeX: number,
  hingeY: number,
  closedDx: number,
  closedDy: number,
  openDx: number,
  openDy: number,
  radius: number,
];

export type Window = [x1: number, y1: number, x2: number, y2: number];

export interface PlanLabel {
  x: number;
  y: number;
  text: string;
}

export interface PlanDef {
  /** Accessible description of the drawing. */
  title: string;
  /** User units per metre, used for the scale bar. */
  unitsPerM: number;
  /** Length of the scale bar in metres (1 or 2). */
  meters: 1 | 2;
  /** Load-bearing and facade walls (thick). */
  walls: string[];
  /** Partitions (thinner). */
  partitions: string[];
  windows: Window[];
  doors: Door[];
  /** Furniture, fittings and other thin linework. */
  fittings: string[];
  labels: PlanLabel[];
}

const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}h${w}v${h}h${-w}z`;

/** Evenly spaced tread lines across a flight (horizontal lines). */
const treads = (x: number, y: number, w: number, h: number, n: number) => {
  const out: string[] = [rect(x, y, w, h)];
  for (let i = 1; i < n; i += 1) {
    const ty = +(y + (h * i) / n).toFixed(1);
    out.push(`M${x} ${ty}h${w}`);
  }
  return out.join('');
};

/** Vertical slats across a rectangle. */
const slats = (x: number, y: number, w: number, h: number, step: number) => {
  const out: string[] = [rect(x, y, w, h)];
  for (let sx = x + step; sx < x + w; sx += step) {
    out.push(`M${sx} ${y}v${h}`);
  }
  return out.join('');
};

/** A door leaf at 90 degrees plus the swing arc. */
export const doorPath = ([hx, hy, cx, cy, ox, oy, r]: Door) => {
  const sweep = cx * oy - cy * ox > 0 ? 1 : 0;
  return `M${hx} ${hy}L${hx + ox * r} ${hy + oy * r}M${hx + cx * r} ${hy + cy * r}A${r} ${r} 0 0 ${sweep} ${hx + ox * r} ${hy + oy * r}`;
};

/** Window symbol: three parallel thin lines across the wall opening. */
export const windowPath = ([x1, y1, x2, y2]: Window) => {
  const horizontal = y1 === y2;
  const offsets = [-3, 0, 3];
  const lines = offsets.map((o) =>
    horizontal ? `M${x1} ${y1 + o}H${x2}` : `M${x1 + o} ${y1}V${y2}`,
  );
  const ends = horizontal
    ? `M${x1} ${y1 - 3}V${y1 + 3}M${x2} ${y1 - 3}V${y1 + 3}`
    : `M${x1 - 3} ${y1}H${x1 + 3}M${x1 - 3} ${y2}H${x1 + 3}`;
  return lines.join('') + ends;
};

const hero: PlanDef = {
  title:
    'Planta de una vivienda rehabilitada: un salón a la izquierda, un distribuidor y, a la derecha, dos dormitorios, la cocina y un baño.',
  unitsPerM: 40,
  meters: 2,
  walls: [
    'M40 300V260M40 200V140M40 80V40H230M290 40H350M410 40H440V300H300M230 300H140M100 300H40',
  ],
  partitions: [
    'M200 40V150M200 190V300M200 150H230M262 150H350M382 150H440M200 190H220M252 190H380M412 190H440M320 40V150M330 190V300',
  ],
  windows: [
    [230, 40, 290, 40],
    [350, 40, 410, 40],
    [40, 80, 40, 140],
    [40, 200, 40, 260],
    [230, 300, 300, 300],
  ],
  doors: [
    [262, 150, -1, 0, 0, -1, 32],
    [382, 150, -1, 0, 0, -1, 32],
    [252, 190, -1, 0, 0, 1, 32],
    [412, 190, -1, 0, 0, 1, 32],
    [140, 300, -1, 0, 0, -1, 40],
  ],
  fittings: [
    rect(90, 70, 64, 36),
    rect(56, 224, 88, 36),
    rect(206, 278, 118, 18),
    rect(340, 196, 26, 18),
    rect(416, 200, 18, 26),
    rect(336, 274, 72, 22),
  ],
  labels: [
    { x: 120, y: 180, text: 'Salón' },
    { x: 260, y: 100, text: 'Dormitorio 1' },
    { x: 380, y: 100, text: 'Dormitorio 2' },
    { x: 265, y: 244, text: 'Cocina' },
    { x: 385, y: 250, text: 'Baño' },
  ],
};

const vivienda: PlanDef = {
  title:
    'Planta de una vivienda de planta alta: dormitorio y baño a la izquierda, y un gran salón con cocina abierta a la derecha.',
  unitsPerM: 36,
  meters: 2,
  walls: [
    'M40 300V40H70M140 40H230M330 40H400V80M400 180V300H350M250 300H96M60 300H40',
  ],
  partitions: [
    'M170 40V230M170 290V300M40 150H130M110 150V220M40 220H70M102 220H110',
  ],
  windows: [
    [70, 40, 140, 40],
    [230, 40, 330, 40],
    [400, 80, 400, 180],
    [250, 300, 350, 300],
  ],
  doors: [
    [166, 150, -1, 0, 0, -1, 36],
    [102, 220, -1, 0, 0, -1, 32],
    [96, 300, -1, 0, 0, -1, 36],
  ],
  fittings: [
    rect(48, 58, 54, 72),
    rect(44, 154, 24, 62),
    rect(80, 160, 16, 22),
    rect(236, 46, 160, 22),
    rect(250, 112, 100, 30),
    rect(196, 238, 84, 30),
    rect(310, 232, 50, 36),
  ],
  labels: [
    { x: 135, y: 96, text: 'Dorm.' },
    { x: 285, y: 190, text: 'Salón · cocina' },
  ],
};

const altillo: PlanDef = {
  title:
    'Planta de un piso pequeño con una escalera que sube a un altillo: estar y comedor a la izquierda, cocina y baño a la derecha.',
  unitsPerM: 40,
  meters: 2,
  walls: [
    'M60 300V266M60 230V190M60 100V50H90M170 50H330M390 50H420V300H200M120 300H60',
  ],
  partitions: ['M280 50V90M280 170V210M280 242V300M280 170H420'],
  windows: [
    [60, 100, 60, 190],
    [90, 50, 170, 50],
    [330, 50, 390, 50],
    [120, 300, 200, 300],
  ],
  doors: [
    [60, 266, 0, -1, 1, 0, 36],
    [280, 242, 0, -1, 1, 0, 32],
  ],
  fittings: [
    treads(232, 56, 44, 110, 10),
    'M254 160V70M248 78L254 68L260 78',
    rect(100, 130, 88, 34),
    rect(130, 226, 64, 36),
    rect(284, 54, 132, 20),
    rect(344, 270, 72, 26),
    rect(286, 176, 20, 16),
    rect(396, 176, 18, 24),
  ],
  labels: [
    { x: 160, y: 202, text: 'Estar · comedor' },
    { x: 254, y: 186, text: 'Altillo' },
    { x: 355, y: 125, text: 'Cocina' },
    { x: 350, y: 238, text: 'Baño' },
  ],
};

const escalera: PlanDef = {
  title:
    'Planta del portal y la escalera de un edificio: dos tramos de escalera con un ascensor nuevo en el hueco central.',
  unitsPerM: 44,
  meters: 2,
  walls: ['M140 300V50H220M260 50H340V300H280M200 300H140'],
  partitions: [rect(212, 160, 56, 66)],
  windows: [[220, 50, 260, 50]],
  doors: [
    [200, 300, 1, 0, 0, -1, 40],
    [280, 300, -1, 0, 0, -1, 40],
  ],
  fittings: [
    treads(156, 106, 48, 150, 14),
    treads(276, 106, 48, 150, 14),
    'M180 250V114M174 122L180 112L186 122',
    'M300 112V248M294 240L300 250L306 240',
    'M212 160L268 226M268 160L212 226',
    rect(298, 284, 34, 12),
  ],
  labels: [
    { x: 240, y: 86, text: 'Rellano' },
    { x: 240, y: 246, text: 'Ascensor' },
    { x: 172, y: 288, text: 'Portal' },
  ],
};

const cocina: PlanDef = {
  title:
    'Planta de una cocina estrecha: encimera corrida bajo la ventana, un frente de lamas junto a la puerta y estantes en la pared de enfrente.',
  unitsPerM: 70,
  meters: 1,
  walls: ['M90 250V190M90 127V90H390V250H330M210 250H90'],
  partitions: [],
  windows: [[210, 250, 330, 250]],
  doors: [[90, 190, 0, -1, 1, 0, 63]],
  fittings: [
    rect(96, 205, 288, 42),
    rect(240, 212, 60, 28),
    rect(120, 212, 56, 28),
    'M148 212V240M120 226H176',
    slats(176, 96, 120, 26, 8),
    rect(366, 96, 18, 100),
  ],
  labels: [
    { x: 270, y: 160, text: 'Cocina' },
    { x: 250, y: 196, text: 'Encimera maciza' },
  ],
};

const oficina: PlanDef = {
  title:
    'Planta de una oficina diáfana: una sala de trabajo con mesas corridas, una sala de reuniones acristalada, un office y un aseo.',
  unitsPerM: 28,
  meters: 2,
  walls: [
    'M40 300V50H70M150 50H190M270 50H440V300H350M310 300H270M190 300H150M60 300H40',
  ],
  partitions: [
    'M300 50V80M300 112V150M300 150H440M370 210V300M370 210H380M412 210H440',
  ],
  windows: [
    [70, 50, 150, 50],
    [190, 50, 270, 50],
    [60, 300, 150, 300],
    [190, 300, 270, 300],
  ],
  doors: [
    [300, 112, 0, -1, 1, 0, 32],
    [412, 210, -1, 0, 0, 1, 32],
    [350, 300, -1, 0, 0, -1, 40],
  ],
  fittings: [
    ...[70, 110, 150, 190].map((x) => rect(x, 110, 40, 20)),
    ...[70, 110, 150, 190].map((x) => rect(x, 130, 40, 20)),
    rect(44, 170, 16, 110),
    rect(340, 70, 76, 44),
    rect(306, 156, 70, 18),
    rect(420, 264, 16, 24),
    rect(380, 276, 20, 14),
  ],
  labels: [
    { x: 160, y: 200, text: 'Sala de trabajo' },
    { x: 378, y: 138, text: 'Reuniones' },
    { x: 400, y: 190, text: 'Office' },
    { x: 399, y: 258, text: 'Aseo' },
  ],
};

export const plans = {
  hero,
  vivienda,
  altillo,
  escalera,
  cocina,
  oficina,
} satisfies Record<string, PlanDef>;

export type PlanVariant = keyof typeof plans;
