import { z } from "zod";
import { idSchema, nonemptyText } from "./money";
import { evidenceReferenceSchema } from "./evidence";

export const componentSchema = z.enum(["roof", "heating_system", "cooling_system", "water_heater", "electrical", "plumbing", "ceiling", "foundation", "other"]);
export const findingSchema = z.strictObject({
  id: idSchema,
  component: componentSchema,
  description: nonemptyText,
  evidenceClass: z.enum(["disclosed_fact", "reported_inspection_finding", "visual_observation", "user_assumption"]),
  evidence: z.array(evidenceReferenceSchema).min(1).max(12),
  needsProfessionalAssessment: z.boolean(),
  followUpQuestion: nonemptyText.nullable(),
});
export type Finding = z.infer<typeof findingSchema>;
