import { z } from "zod";
import rawSources from "../../data/sources.json";
import rawIndicators from "../../data/condition-indicators.json";
import rawPatterns from "../../data/condition-patterns.json";

export const KNOWLEDGE_VERSION = "whole-home-2026-10-24-v2";
export const sources = z.array(z.strictObject({
  id: z.string(), publisher: z.string(), title: z.string(), url: z.url().startsWith("https://"),
  basis: z.string(), publishedAt: z.iso.date().nullable(), checkedAt: z.iso.date(),
})).parse(rawSources);
export const sourceById = new Map(sources.map((source) => [source.id, source]));
export const indicators = z.array(z.strictObject({
  id: z.string(), components: z.array(z.string()).min(1), sign: z.string(), alternativeExplanations: z.string(),
  verification: z.string(), sourceIds: z.array(z.string()).min(1),
  priority: z.enum(["prompt_assessment", "investigate", "preference_only"]), costCatalogIds: z.array(z.string()),
})).parse(rawIndicators);
export const indicatorById = new Map(indicators.map((item) => [item.id, item]));
export const patterns = z.array(z.strictObject({
  id: z.string(), allOf: z.array(z.array(z.string()).min(1)).min(2), hypothesis: z.string(),
  verification: z.string(), sourceIds: z.array(z.string()).min(1),
})).parse(rawPatterns);
for (const item of [...indicators, ...patterns]) {
  if (item.sourceIds.some((id) => !sourceById.has(id))) throw new Error("Unknown research citation");
}
for (const pattern of patterns) {
  if (pattern.allOf.flat().some((id) => !indicatorById.has(id))) throw new Error("Unknown pattern indicator");
}
if (sourceById.size !== sources.length || indicatorById.size !== indicators.length) throw new Error("Duplicate catalog ID");
export function resolveSources(ids: string[]) {
  return Array.from(new Set(ids)).map((id) => {
    const source = sourceById.get(id);
    if (!source) throw new Error("Unknown research citation");
    return source;
  });
}
