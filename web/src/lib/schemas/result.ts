import { z } from "zod";
import { centsSchema, signedCentsSchema, nonemptyText } from "./money";

export const analysisResultSchema = z.strictObject({
  status: z.enum(["within_stated_budget", "cash_shortfall", "monthly_budget_overrun", "needs_information"]),
  flags: z.array(z.enum(["immediate_cash_shortfall", "later_cash_shortfall", "monthly_budget_overrun", "missing_information"])).max(4),
  missingInputs: z.array(nonemptyText).max(50),
  monthlyOwnershipCents: centsSchema.nullable(),
  availableMonthlyRepairContributionCents: signedCentsSchema.nullable(),
  immediateCashGapCents: centsSchema.nullable(),
}).superRefine((data, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  const missing = data.missingInputs.length > 0 || data.monthlyOwnershipCents === null || data.availableMonthlyRepairContributionCents === null || data.immediateCashGapCents === null;
  if (new Set(data.flags).size !== data.flags.length) issue("Result flags must be unique.");
  if (missing && (data.status !== "needs_information" || !data.flags.includes("missing_information"))) issue("Incomplete results must explicitly require more information.");
  if (data.status === "needs_information" && (!missing || !data.flags.includes("missing_information"))) issue("A missing-information result must identify unresolved information.");
  if (data.flags.includes("missing_information") && data.status !== "needs_information") issue("Missing information takes precedence over a final verdict.");
  if ((data.immediateCashGapCents ?? 0) > 0 && !data.flags.includes("immediate_cash_shortfall")) issue("An immediate cash gap must be flagged.");
  if (data.flags.includes("immediate_cash_shortfall") && !(data.immediateCashGapCents !== null && data.immediateCashGapCents > 0)) issue("An immediate shortfall flag requires a positive gap.");
  if ((data.availableMonthlyRepairContributionCents ?? 0) < 0 && !data.flags.includes("monthly_budget_overrun")) issue("Negative available contribution must be flagged.");
  if (data.flags.includes("monthly_budget_overrun") && !(data.availableMonthlyRepairContributionCents !== null && data.availableMonthlyRepairContributionCents < 0)) issue("A monthly overrun flag requires a negative contribution.");
  if (data.status === "within_stated_budget" && (missing || data.flags.length > 0 || data.immediateCashGapCents !== 0 || (data.availableMonthlyRepairContributionCents ?? -1) < 0)) issue("Within-budget results cannot contain unresolved inputs or shortfalls.");
  if (data.status === "cash_shortfall" && !data.flags.some((flag) => flag === "immediate_cash_shortfall" || flag === "later_cash_shortfall")) issue("Cash shortfall requires a supporting flag.");
  if (data.status === "monthly_budget_overrun" && !data.flags.includes("monthly_budget_overrun")) issue("Monthly overrun requires a supporting flag.");
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
