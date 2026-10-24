import { z } from "zod";
import { idSchema, nonemptyText } from "./money";
import { evidenceReferenceSchema } from "./evidence";
import { indicatorById } from "../condition/knowledge";

export const componentSchema = z.enum(["roof", "heating_system", "cooling_system", "water_heater", "electrical", "plumbing", "ceiling", "foundation", "structure", "attic", "ventilation", "kitchen", "bathroom", "appliances", "interior", "windows_doors", "exterior", "deck", "drainage", "landscaping", "fireplace", "garage", "pests", "environmental", "sewer_septic", "well_water", "pool", "other"]);
export const conditionStateSchema = z.enum(["current", "historical", "resolved", "unknown"]);
export const findingSchema = z.strictObject({
  id: idSchema,
  component: componentSchema,
  conditionState: conditionStateSchema.default("unknown"),
  indicatorIds: z.array(z.string().max(80)).max(8).default([]),
  description: nonemptyText,
  evidenceClass: z.enum(["disclosed_fact", "reported_inspection_finding", "visual_observation", "user_assumption"]),
  evidence: z.array(evidenceReferenceSchema).min(1).max(12),
  needsProfessionalAssessment: z.boolean(),
  followUpQuestion: nonemptyText.nullable(),
}).superRefine((finding, ctx) => {
  const seen = new Set<string>();
  finding.indicatorIds.forEach((id, index) => {
    const indicator = indicatorById.get(id);
    if (!indicator || !indicator.components.includes(finding.component) || seen.has(id)) ctx.addIssue({ code: "custom", path: ["indicatorIds", index], message: "Use a unique research indicator appropriate to this component." });
    seen.add(id);
  });
});
export type Finding = z.infer<typeof findingSchema>;
