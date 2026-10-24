import { z } from "zod";
import { budgetSchema } from "./budget";
import { sourceSchema } from "./evidence";
import { componentSchema, findingSchema } from "./finding";
import { propertySchema } from "./property";

import { validateEvidence } from "./validate-evidence";

// This is the reviewed analysis boundary, not a raw model-response or upload schema.
export const analysisInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  property: propertySchema,
  budget: budgetSchema,
  sources: z.array(sourceSchema).max(12),
  findings: z.array(findingSchema).max(40),
  unassessedComponents: z.array(componentSchema).max(componentSchema.options.length),
}).superRefine((data, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (data.property.priceCents !== null && data.budget.downPaymentCents !== null && data.budget.downPaymentCents > data.property.priceCents) {
    issue(["budget", "downPaymentCents"], "Down payment cannot exceed the property price.");
  }
  validateEvidence(data, ctx);
});
export type AnalysisInput = z.infer<typeof analysisInputSchema>;
