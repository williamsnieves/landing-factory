/**
 * Sample content of the fictional TALLER 303 festival. Every name, date, time,
 * price and capacity is a placeholder to replace before launch. The artists
 * are invented. One source for the line-up and the timetable keeps them equal.
 */
export const TICKET_URL = 'https://example.com/entradas';

export type StageId = 'nave' | 'caldera' | 'foso';

export interface Stage {
  id: StageId;
  name: string;
  capacity: string;
  sound: string;
  what: string;
}

export const stages: Stage[] = [
  {
    id: 'nave',
    name: 'Nave',
    capacity: '4.000',
    sound: 'Sistema principal en cuatro torres',
    what: 'Cabezas de cartel, luces de nave completa y el suelo temblando.',
  },
  {
    id: 'caldera',
    name: 'Caldera',
    capacity: '1.200',
    sound: 'Pared de graves, sonido seco',
    what: 'Ritmos duros, sets largos y una sala que se calienta sola.',
  },
  {
    id: 'foso',
    name: 'Foso',
    capacity: '350',
    sound: 'Sala baja, sonido a pie de cabina',
    what: 'Experimentos, directos raros y el primer y el último turno.',
  },
];

export const stageName = (id: StageId): string =>
  stages.find((s) => s.id === id)?.name ?? id;

export interface Act {
  time: string;
  name: string;
  stage: StageId;
  headliner?: boolean;
}

export interface Turno {
  n: string;
  weekday: string;
  date: string;
  short: string;
  doors: string;
  close: string;
  acts: Act[];
}

export const turnos: Turno[] = [
  {
    n: '01',
    weekday: 'Viernes',
    date: '12 de junio',
    short: 'Vie 12',
    doors: '18:00',
    close: '05:00',
    acts: [
      { time: '19:00', name: 'Mono Trece', stage: 'foso' },
      { time: '20:30', name: 'Saldo Cero', stage: 'caldera' },
      { time: '22:00', name: 'Lorea Kanpai', stage: 'foso' },
      { time: '23:00', name: 'Hierro Dulce', stage: 'nave', headliner: true },
      { time: '00:30', name: 'Dúo Remache', stage: 'caldera' },
      { time: '02:00', name: 'Tornillo Azul', stage: 'foso' },
    ],
  },
  {
    n: '02',
    weekday: 'Sábado',
    date: '13 de junio',
    short: 'Sáb 13',
    doors: '17:00',
    close: '05:00',
    acts: [
      { time: '17:30', name: 'Nora Tuerca', stage: 'foso' },
      { time: '19:00', name: 'Pulso Gravilla', stage: 'caldera' },
      { time: '21:00', name: 'Ane Cobalto', stage: 'foso' },
      { time: '22:30', name: 'Fundición Siete', stage: 'caldera' },
      { time: '00:00', name: 'Lacre Nueve', stage: 'nave', headliner: true },
      { time: '02:30', name: 'Zuhaitz Nulo', stage: 'caldera' },
    ],
  },
  {
    n: '03',
    weekday: 'Domingo',
    date: '14 de junio',
    short: 'Dom 14',
    doors: '16:00',
    close: '01:00',
    acts: [
      { time: '16:30', name: 'Bruma Fría', stage: 'foso' },
      { time: '18:00', name: 'Maite Vox', stage: 'caldera' },
      { time: '19:30', name: 'Sala Gris', stage: 'foso' },
      { time: '21:00', name: 'Ruido Blanco Colectivo', stage: 'caldera' },
      { time: '22:30', name: 'Cámara Hueca', stage: 'nave', headliner: true },
      { time: '00:00', name: 'Último Turno', stage: 'foso' },
    ],
  },
];

export interface Ticket {
  name: string;
  includes: string;
  price: string;
  primary?: boolean;
}

export const tickets: Ticket[] = [
  {
    name: 'Turno suelto',
    includes: 'Un día a elegir, los tres escenarios, pulsera de un turno.',
    price: '59 €',
  },
  {
    name: 'Abono 3 turnos',
    includes: 'Viernes, sábado y domingo. Reentrada en cada turno.',
    price: '139 €',
    primary: true,
  },
  {
    name: 'Abono supervisor',
    includes:
      'Los tres turnos, entrada 30 minutos antes y guardarropa incluido.',
    price: '189 €',
  },
];

export const nav = [
  { href: '#lineup', label: 'Line-up' },
  { href: '#escenarios', label: 'Escenarios' },
  { href: '#horarios', label: 'Horarios' },
  { href: '#llegar', label: 'Cómo llegar' },
  { href: '#normas', label: 'Normas' },
];
