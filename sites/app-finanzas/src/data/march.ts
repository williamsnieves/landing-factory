/** Sample month shown everywhere on the page. All figures are sample data. */
export interface Category {
  name: string;
  spent: number;
  budget: number;
}

export const month = 'Marzo';
export const categories: Category[] = [
  { name: 'Vivienda', spent: 720, budget: 720 },
  { name: 'Comida', spent: 310, budget: 280 },
  { name: 'Transporte', spent: 95, budget: 110 },
  { name: 'Ocio', spent: 140, budget: 150 },
  { name: 'Suscripciones', spent: 38, budget: 45 },
  { name: 'Otros', spent: 85, budget: 145 },
];

export const totalSpent = categories.reduce((n, c) => n + c.spent, 0);
export const totalBudget = categories.reduce((n, c) => n + c.budget, 0);
export const goal = { name: 'Viaje de verano', saved: 640, target: 1200 };
export const fund = {
  name: 'Fondo para imprevistos',
  saved: 900,
  target: 2000,
};

const fmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});
/** Spanish money format: 1.388,00 € (non-breaking space before the sign) */
export const eur = (n: number) => `${fmt.format(n)} €`;
export const pct = (a: number, b: number) => Math.round((a / b) * 100);
