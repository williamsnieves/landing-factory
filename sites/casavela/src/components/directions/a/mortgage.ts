// Mortgage math shared by the calculator's server-rendered example and its browser script, so the page shows
// the same result with or without JavaScript. French amortization: M = P * r / (1 - (1 + r)^-n).

export interface MortgageInput {
  /** Price of the home, in euros. */
  price: number;
  /** Savings the buyer contributes, in euros. */
  savings: number;
  /** Term in years. */
  years: number;
  /** Nominal annual interest rate, in percent (3 = 3 %). */
  annualRate: number;
}

export interface MortgageResult {
  /** Amount borrowed: price minus savings, never below zero. */
  loan: number;
  /** Monthly payment, or null when the input cannot give one. */
  monthly: number | null;
}

/** Sample starting values; the rate is labelled on the page as an example to change. */
export const defaults: MortgageInput = {
  price: 200000,
  savings: 50000,
  years: 30,
  annualRate: 3,
};

export function computeMortgage(input: MortgageInput): MortgageResult {
  const { price, savings, years, annualRate } = input;
  if (![price, savings, years, annualRate].every(Number.isFinite)) {
    return { loan: 0, monthly: null };
  }
  const loan = Math.max(price - Math.max(savings, 0), 0);
  const months = Math.round(years * 12);
  if (price <= 0 || months <= 0 || annualRate < 0) {
    return { loan, monthly: null };
  }
  if (loan === 0) return { loan, monthly: 0 };
  const r = annualRate / 12 / 100;
  const monthly =
    r === 0 ? loan / months : (loan * r) / (1 - (1 + r) ** -months);
  return { loan, monthly };
}

const euro = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Whole euros in Spanish format, or a dash when there is no value. */
export function formatEuro(value: number | null): string {
  return value === null ? '—' : euro.format(Math.round(value));
}
