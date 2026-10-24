import { z } from "zod";
import { componentSchema, conditionStateSchema, findingSchema } from "./finding";
import { sourceSchema } from "./evidence";
import { validateEvidence } from "./validate-evidence";

const text = z.string().trim().min(1).max(16000);
export const extractionRequestSchema = z.strictObject({
  listingText: text.optional(),
  reportPages: z.array(text).max(20).default([]),
  images: z.array(z.strictObject({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(4).max(1398104),
  })).max(6).default([]),
  property: z.strictObject({ yearBuilt: z.number().int().min(1600).max(new Date().getFullYear()).nullable() }).optional(),
}).superRefine((data, ctx) => {
  if (!data.listingText && !data.reportPages.length && !data.images.length) ctx.addIssue({ code: "custom", message: "Provide at least one evidence source." });
  if ((data.listingText?.length ?? 0) + data.reportPages.reduce((n, p) => n + p.length, 0) > 16000) ctx.addIssue({ code: "custom", message: "Combined source text exceeds the input limit." });
});
export const extractionOutputSchema = z.strictObject({
  findings: z.array(findingSchema.safeExtend({
    conditionState: conditionStateSchema,
    evidenceClass: z.enum(["disclosed_fact", "reported_inspection_finding", "visual_observation"]),
  })).max(20),
  unassessedComponents: z.array(componentSchema).max(componentSchema.options.length),
});
export const attributedExtractionSchema = extractionOutputSchema.extend({ sources: z.array(sourceSchema).max(8) }).superRefine(validateEvidence);
export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;
export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;
