import "server-only";
import { z } from "zod";
import rawCatalog from "../../data/cost-catalog.json";
import { sourceById } from "../../lib/condition/knowledge";

const cents = z.number().int().nonnegative().safe();
export const costCatalog = z.array(z.strictObject({
  id: z.string(), components: z.array(z.string()).min(1), title: z.string(),
  lowCents: cents, highCents: cents, sourceId: z.string(),
  unit: z.enum(["project", "each", "linear_foot"]), geography: z.enum(["northern_virginia", "us_national"]),
  assumptions: z.string(), exclusions: z.string(), conflicts: z.array(z.string()),
  purpose: z.enum(["repair_scenario", "assessment", "elective_remodel"]),
}).refine((record) => record.lowCents <= record.highCents && sourceById.has(record.sourceId))).parse(rawCatalog);
const byId = new Map(costCatalog.map((record) => [record.id, record]));
if (byId.size !== costCatalog.length) throw new Error("Duplicate cost catalog ID");
export const estimateRequestSchema = z.strictObject({
  region: z.enum(["northern_virginia", "maryland", "dc", "other_us"]),
  allowNationalFallback: z.boolean().default(false),
  items: z.array(z.strictObject({
    catalogId: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
    quantity: z.number().int().positive().max(10000).nullable().default(null),
    scopeConfirmed: z.boolean(),
  })).min(1).max(30),
});

export function estimateCosts(input: unknown, date = new Date()) {
  const request = estimateRequestSchema.parse(input);
  const selected = new Set<string>();
  for (const item of request.items) {
    if (selected.has(item.catalogId)) throw new Error("Duplicate scope");
    const record = byId.get(item.catalogId);
    for (const priorId of selected) {
      const prior = byId.get(priorId);
      if (record && prior && (record.conflicts.includes(prior.id) || record.components.some((c) => prior.components.includes(c)))) {
        throw new Error("Overlapping scopes: compare these alternatives in separate estimates");
      }
    }
    selected.add(item.catalogId);
  }
  const lines = request.items.map((item) => {
    const record = byId.get(item.catalogId);
    const source = record ? sourceById.get(record.sourceId)! : null;
    const base = { catalogId: item.catalogId, quantity: item.quantity, source,
      geography: record?.geography ?? null, title: record?.title ?? "Scope needs a professional quote",
      unit: record?.unit ?? null, assumptions: record?.assumptions ?? null, exclusions: record?.exclusions ?? null,
      purpose: record?.purpose ?? null, priceBasis: source?.basis ?? null };
    const unknown = (status: string) => ({ ...base, status, lowCents: null, highCents: null });
    if (!record) return unknown("quote_required");
    if (!item.scopeConfirmed) return unknown("scope_required");
    if (item.quantity === null || (record.unit === "project" && item.quantity !== 1)) return unknown("quantity_required");
    const reviewAge = (date.getTime() - Date.parse(source!.checkedAt)) / 86400000;
    // Review interval is application policy, not a claim that prices are guaranteed for 180 days.
    if (!Number.isFinite(reviewAge) || reviewAge < 0 || reviewAge > 180) return unknown("source_review_required");
    if (record.geography === "us_national" && !request.allowNationalFallback) return unknown("national_fallback_required");
    if (record.geography !== "us_national" && record.geography !== request.region) return unknown("region_mismatch");
    return { ...base, status: "planning_range", lowCents: record.lowCents * item.quantity, highCents: record.highCents * item.quantity };
  });
  const priced = lines.filter((line) => line.lowCents !== null && line.highCents !== null);
  const subtotal = priced.length ? { lowCents: priced.reduce((n, line) => n + line.lowCents!, 0), highCents: priced.reduce((n, line) => n + line.highCents!, 0) } : null;
  const complete = priced.length === lines.length;
  return { catalogVersion: "2026-10-24-v1", currency: "USD", lines, subtotal,
    total: complete ? subtotal : null, complete, resaleValueImpact: null,
    limitation: "Published planning prices for selected scopes, not bids, invoices, a whole-home repair budget or a property valuation. Unselected and concealed work is not included. No inferred quantities, local multipliers, rebates or model-generated prices." };
}
