import { z } from "zod";
import { idSchema } from "./money";

const sourceText = z.string().trim().min(1).max(20000);
export const sourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ id: idSchema, kind: z.literal("listing_text"), text: sourceText }),
  z.strictObject({ id: idSchema, kind: z.literal("buyer_note"), text: sourceText }),
  z.strictObject({ id: idSchema, kind: z.literal("image"), label: z.string().trim().min(1).max(200) }),
  z.strictObject({ id: idSchema, kind: z.literal("inspection_report"), pages: z.array(sourceText).min(1).max(60) }),
]);
export const evidenceReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("image"), sourceId: idSchema }),
  z.strictObject({ kind: z.literal("text"), sourceId: idSchema, quote: sourceText }),
  z.strictObject({ kind: z.literal("report"), sourceId: idSchema, page: z.number().int().min(1).max(60), quote: sourceText }),
]);
export type EvidenceSource = z.infer<typeof sourceSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
