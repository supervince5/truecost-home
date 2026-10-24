import { z } from "zod";
import { centsSchema, nonemptyText } from "./money";

export const propertySchema = z.strictObject({
  priceCents: centsSchema.nullable(),
  locality: nonemptyText.nullable(),
  yearBuilt: z.number().int().min(1600).max(new Date().getFullYear()).nullable(),
});
export type Property = z.infer<typeof propertySchema>;
