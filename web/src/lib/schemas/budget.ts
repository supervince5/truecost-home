import { z } from "zod";
import { centsSchema } from "./money";

export const budgetSchema = z.strictObject({
  totalPurchaseCashCents: centsSchema.nullable(),
  downPaymentCents: centsSchema.nullable(),
  closingCostsCents: centsSchema.nullable(),
  protectedSavingsCents: centsSchema.nullable(),
  monthlyHousingBudgetCents: centsSchema.nullable(),
  annualInterestRatePercent: z.number().min(0).max(100).nullable(),
  loanTermMonths: z.number().int().min(1).max(600).nullable(),
  monthlyPropertyTaxCents: centsSchema.nullable(),
  monthlyInsuranceCents: centsSchema.nullable(),
  monthlyMortgageInsuranceCents: centsSchema.nullable(),
  monthlyHoaCents: centsSchema.nullable(),
  monthlyUtilitiesCents: centsSchema.nullable(),
  monthlyMaintenanceCents: centsSchema.nullable(),
});
export type Budget = z.infer<typeof budgetSchema>;
