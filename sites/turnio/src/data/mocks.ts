/**
 * Content of the HTML/CSS product mocks. Service words and times only: no client names, no figures,
 * no ratings. Times are scene labels of one illustrative working day, never metrics.
 */

export type BlockTone = 'soft' | 'panel' | 'new';

export interface AgendaBlock {
  /** Column index (0-based) in `dayAgenda.columns`. */
  column: number;
  /** First half-hour row (0 = first hour of `dayAgenda.hours`). */
  start: number;
  /** Number of half-hour rows. */
  span: number;
  service: string;
  /** Shown only on blocks of two rows or more. */
  time?: string;
  tone: BlockTone;
  /** Short note on the new booking. */
  note?: string;
}

export const dayAgenda = {
  title: 'Agenda',
  day: 'Martes',
  views: ['Día', 'Semana'],
  newLabel: 'Nueva cita',
  columns: ['Sillón 1', 'Sillón 2', 'Cabina'],
  hours: [
    '9:00',
    '9:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
  ],
  blocks: [
    { column: 0, start: 0, span: 1, service: 'Corte', tone: 'panel' },
    {
      column: 0,
      start: 1,
      span: 3,
      service: 'Color',
      time: '9:30 – 11:00',
      tone: 'soft',
    },
    {
      column: 0,
      start: 5,
      span: 2,
      service: 'Corte y peinado',
      time: '11:30',
      tone: 'panel',
    },
    { column: 0, start: 8, span: 1, service: 'Barba', tone: 'panel' },
    {
      column: 1,
      start: 0,
      span: 3,
      service: 'Mechas',
      time: '9:00 – 10:30',
      tone: 'panel',
    },
    { column: 1, start: 4, span: 1, service: 'Corte', tone: 'soft' },
    {
      column: 1,
      start: 6,
      span: 2,
      service: 'Peinado',
      time: '12:00',
      tone: 'new',
      note: 'Desde Instagram',
    },
    { column: 1, start: 9, span: 1, service: 'Corte', tone: 'panel' },
    {
      column: 2,
      start: 1,
      span: 2,
      service: 'Manicura',
      time: '9:30',
      tone: 'soft',
    },
    { column: 2, start: 4, span: 1, service: 'Cejas', tone: 'panel' },
    {
      column: 2,
      start: 6,
      span: 3,
      service: 'Facial',
      time: '12:00 – 13:30',
      tone: 'soft',
    },
  ] satisfies AgendaBlock[],
  detail: {
    title: 'Nueva reserva',
    rows: [
      { label: 'Servicio', value: 'Peinado' },
      { label: 'Hora', value: '12:00' },
      { label: 'Sillón', value: 'Sillón 2' },
      { label: 'Origen', value: 'Instagram' },
      { label: 'Recordatorio', value: 'WhatsApp' },
    ],
  },
};

export const bookingPage = {
  salon: 'Tu salón',
  steps: {
    service: 'Servicio',
    day: 'Día',
    time: 'Hora',
  },
  services: [
    { name: 'Corte', selected: true },
    { name: 'Color', selected: false },
    { name: 'Peinado', selected: false },
  ],
  days: [
    { name: 'L', selected: false },
    { name: 'M', selected: false },
    { name: 'X', selected: false },
    { name: 'J', selected: true },
    { name: 'V', selected: false },
    { name: 'S', selected: false },
  ],
  slots: [
    { time: '9:30', selected: false },
    { time: '10:30', selected: true },
    { time: '12:00', selected: false },
    { time: '17:00', selected: false },
  ],
  button: 'Reservar',
};

export const instagramProfile = {
  name: 'Tu salón',
  kind: 'Peluquería',
  actions: ['Reservar', 'Mensaje'],
};

export const reminderChat = {
  contact: 'Tu salón',
  status: 'Mensaje automático',
  day: 'Hoy',
  message:
    'Hola, te recordamos tu cita de corte mañana a las 10:30 en Tu salón. Si necesitas cambiarla, puedes hacerlo aquí:',
  link: 'Cambiar mi cita',
  time: '19:00',
};

export const weekView = {
  title: 'Semana',
  filters: [
    { name: 'Todos', selected: false },
    { name: 'Sillón 1', selected: true },
    { name: 'Sillón 2', selected: false },
    { name: 'Cabina', selected: false },
  ],
  tag: 'Plan Equipo',
  /** Abstract appointment blocks per day: heights as shares of the column. */
  days: [
    { name: 'Lun', blocks: [0.18, 0.3, 0.12] },
    { name: 'Mar', blocks: [0.24, 0.16, 0.28] },
    { name: 'Mié', blocks: [0.12, 0.22] },
    { name: 'Jue', blocks: [0.3, 0.2, 0.2] },
    { name: 'Vie', blocks: [0.26, 0.34, 0.16] },
    { name: 'Sáb', blocks: [0.4, 0.3] },
  ],
  /** Occupancy bars of the report panel, as shares of the bar track (no numbers are shown). */
  report: [
    { name: 'Lun', share: 0.55 },
    { name: 'Mar', share: 0.62 },
    { name: 'Mié', share: 0.38 },
    { name: 'Jue', share: 0.7 },
    { name: 'Vie', share: 0.82 },
    { name: 'Sáb', share: 0.74 },
  ],
};
