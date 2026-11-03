/**
 * Plans, prices and sign-up links, copied exactly from brief.json (`offer`, `goal`). Names, prices,
 * descriptions and URLs must not be reworded: check-landing compares them with the built page.
 */

export interface Action {
  label: string;
  href: string;
}

export interface Plan {
  id: 'gratis' | 'pro' | 'equipo';
  name: string;
  /** Price exactly as the brief writes it. */
  price: string;
  /** Numeric monthly price in euros, for structured data. */
  amount: number;
  description: string;
  url: string;
  cta: string;
  /** The highlighted plan (Pro: it holds the WhatsApp reminders). */
  featured: boolean;
  /** Short factual tag shown on the highlighted plan. */
  tag?: string;
}

export const primaryAction: Action = {
  label: 'Empieza gratis',
  href: 'https://app.example.com/registro?plan=gratis',
};

export const secondaryAction: Action = {
  label: 'Prueba el Pro 14 días',
  href: 'https://app.example.com/registro?plan=pro',
};

export const plans: Plan[] = [
  {
    id: 'gratis',
    name: 'Plan Gratis',
    price: '0 €',
    amount: 0,
    description:
      'Para empezar: un profesional, hasta 50 citas al mes, enlace de reservas y recordatorios por email.',
    url: 'https://app.example.com/registro?plan=gratis',
    cta: primaryAction.label,
    featured: false,
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    price: '19 €/mes',
    amount: 19,
    description:
      'Citas ilimitadas, recordatorios por WhatsApp, reservas desde Instagram y pago de señal al reservar. Prueba de 14 días sin tarjeta.',
    url: 'https://app.example.com/registro?plan=pro',
    cta: secondaryAction.label,
    featured: true,
    tag: 'con recordatorios por WhatsApp',
  },
  {
    id: 'equipo',
    name: 'Plan Equipo',
    price: '39 €/mes',
    amount: 39,
    description:
      'Todo lo del Pro para hasta 8 profesionales, agenda por cabina o sillón e informes de ocupación.',
    url: 'https://app.example.com/registro?plan=equipo',
    cta: 'Empieza con el Plan Equipo',
    featured: false,
  },
];

/** One cell of the comparison table: included, not included, or a short value. */
export type Cell =
  { kind: 'yes' } | { kind: 'no' } | { kind: 'text'; text: string };

export interface ComparisonRow {
  feature: string;
  /** One cell per plan, in the order of `plans`. */
  cells: [Cell, Cell, Cell];
}

const yes: Cell = { kind: 'yes' };
const no: Cell = { kind: 'no' };
const text = (value: string): Cell => ({ kind: 'text', text: value });

/**
 * Rows use only what the offer descriptions name. Plan Equipo has "todo lo del Pro"; the booking link is named
 * on Plan Gratis and counted as part of every plan.
 */
export const comparison: ComparisonRow[] = [
  {
    feature: 'Citas al mes',
    cells: [text('Hasta 50'), text('Sin límite'), text('Sin límite')],
  },
  { feature: 'Enlace de reservas', cells: [yes, yes, yes] },
  {
    feature: 'Recordatorios',
    cells: [text('Email'), text('WhatsApp'), text('WhatsApp')],
  },
  { feature: 'Reservas desde Instagram', cells: [no, yes, yes] },
  { feature: 'Pago de señal al reservar', cells: [no, yes, yes] },
  { feature: 'Agenda por cabina o sillón', cells: [no, no, yes] },
  { feature: 'Informes de ocupación', cells: [no, no, yes] },
];
