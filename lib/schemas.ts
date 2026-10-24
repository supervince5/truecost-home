/**
 * Shared data contracts (draft). The Gemma adapter's validated output must
 * match `FindingSchema`; the UI renders only data that passed these schemas.
 * Money is integer cents.
 */
import { z } from "zod";

export const ComponentSchema = z.enum([
  "roof",
  "hvac",
  "plumbing",
  "water_heater",
  "electrical",
  "ceiling",
  "foundation",
  "sewer",
  "other",
]);

export const EvidenceClassSchema = z.enum([
  "visual_observation",
  "report_finding",
  "listing_statement",
  "user_assumption",
]);

/** Highlighted area on a photo, in percent of image width/height. */
export const RegionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(0).max(100),
  h: z.number().min(0).max(100),
});

export const EvidenceRefSchema = z.object({
  source_id: z.string().min(1),
  kind: z.enum(["image", "listing_text", "report_page"]),
  /** Human-readable pointer, e.g. "Photo 2". */
  label: z.string().min(1),
  /** Exact quoted text for listing or report evidence. */
  quote: z.string().optional(),
  page: z.number().int().positive().optional(),
  region: RegionSchema.optional(),
});

export const FindingSchema = z.object({
  id: z.string().min(1),
  component: ComponentSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  evidence_class: EvidenceClassSchema,
  evidence: z.array(EvidenceRefSchema).min(1),
  needs_professional_assessment: z.boolean(),
  follow_up_question: z.string().nullable(),
});

export const UnassessedComponentSchema = z.object({
  component: ComponentSchema,
  label: z.string().min(1),
  reason: z.string().min(1),
});

export const SourceRefSchema = z.object({
  label: z.string().min(1),
  dataset_version: z.string().min(1),
  url: z.url().optional(),
});

/** A sourced repair cost scenario tied to one finding. */
export const RepairScenarioSchema = z.object({
  finding_id: z.string().min(1),
  scope: z.string().min(1),
  low_cents: z.number().int().nonnegative(),
  high_cents: z.number().int().nonnegative(),
  window_months: z.object({ min: z.number().int().nonnegative(), max: z.number().int().nonnegative() }),
  source: SourceRefSchema,
});

export const ReviewStatusSchema = z.enum(["pending", "confirmed", "removed"]);

export const FindingReviewSchema = z.object({
  finding_id: z.string().min(1),
  status: ReviewStatusSchema,
  reason: z.string().optional(),
});

export const PathwaySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  effect: z.string().min(1),
  /** Only approved pathways may change the baseline numbers. */
  approved: z.boolean(),
});

export const PhotoSchema = z.object({
  source_id: z.string().min(1),
  label: z.string().min(1),
  room: z.string().optional(),
  /** Optional URL of a demo image the team has rights to use. */
  src: z.string().optional(),
});

export type Finding = z.infer<typeof FindingSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type UnassessedComponent = z.infer<typeof UnassessedComponentSchema>;
export type RepairScenario = z.infer<typeof RepairScenarioSchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type FindingReview = z.infer<typeof FindingReviewSchema>;
export type Pathway = z.infer<typeof PathwaySchema>;
export type Photo = z.infer<typeof PhotoSchema>;
