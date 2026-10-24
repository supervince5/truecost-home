/**
 * Pure ownership-cost and cash-gap calculations.
 *
 * All money is integer cents. No Next.js, cloud, or model imports: this module
 * must run offline in tests. Rounding: each monthly figure is rounded to the
 * nearest cent once, at the end of its own calculation.
 */

export type Cents = number;

export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

export function formatUsd(cents: Cents, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100;
  const body = abs.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (cents < 0) return `−${body}`;
  if (opts.signed && cents > 0) return `+${body}`;
  return body;
}

/** Monthly principal and interest for a fixed-rate loan. Handles zero interest and no loan. */
export function monthlyPrincipalAndInterest(loan: Cents, annualRatePercent: number, years: number): Cents {
  if (loan <= 0) return 0;
  const n = Math.round(years * 12);
  if (n <= 0) throw new Error("Loan term must be at least one month");
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(loan / n);
  const growth = Math.pow(1 + r, n);
  return Math.round((loan * r * growth) / (growth - 1));
}

export interface OwnershipInputs {
  price: Cents;
  downPayment: Cents;
  annualRatePercent: number;
  termYears: number;
  annualPropertyTax: Cents;
  annualInsurance: Cents;
  /** Annual PMI as a percent of the loan; 0 when not required. */
  pmiAnnualRatePercent: number;
  /** Other entered monthly costs, e.g. HOA dues. */
  otherMonthly: Cents;
}

export interface MonthlyBreakdown {
  loan: Cents;
  principalAndInterest: Cents;
  propertyTax: Cents;
  insurance: Cents;
  pmi: Cents;
  other: Cents;
  total: Cents;
}

export function monthlyOwnershipCost(i: OwnershipInputs): MonthlyBreakdown {
  const loan = Math.max(0, i.price - i.downPayment);
  const principalAndInterest = monthlyPrincipalAndInterest(loan, i.annualRatePercent, i.termYears);
  const propertyTax = Math.round(i.annualPropertyTax / 12);
  const insurance = Math.round(i.annualInsurance / 12);
  const pmi = Math.round((loan * i.pmiAnnualRatePercent) / 100 / 12);
  const other = i.otherMonthly;
  return {
    loan,
    principalAndInterest,
    propertyTax,
    insurance,
    pmi,
    other,
    total: principalAndInterest + propertyTax + insurance + pmi + other,
  };
}

export function cashAfterClosing(savings: Cents, downPayment: Cents, closingCosts: Cents): Cents {
  return savings - downPayment - closingCosts;
}

export interface RepairRange {
  low: Cents;
  high: Cents;
}

export interface CashGap {
  repairLow: Cents;
  repairHigh: Cents;
  /** Shortfall in the best case; 0 when cash covers the low end. */
  shortfallLow: Cents;
  /** Shortfall in the worst case; 0 when cash covers the high end. */
  shortfallHigh: Cents;
  hasGap: boolean;
}

/**
 * Compares cash left after closing with the sum of repair scenarios that fall
 * inside the near-term window. Unknown costs are NOT passed in as zero; callers
 * report unassessed components separately.
 */
export function nearTermCashGap(cashAvailable: Cents, repairs: RepairRange[]): CashGap {
  for (const r of repairs) {
    if (r.low < 0 || r.high < r.low) throw new Error("Invalid repair range");
  }
  const repairLow = repairs.reduce((sum, r) => sum + r.low, 0);
  const repairHigh = repairs.reduce((sum, r) => sum + r.high, 0);
  const shortfallLow = Math.max(0, repairLow - cashAvailable);
  const shortfallHigh = Math.max(0, repairHigh - cashAvailable);
  return { repairLow, repairHigh, shortfallLow, shortfallHigh, hasGap: shortfallHigh > 0 };
}
