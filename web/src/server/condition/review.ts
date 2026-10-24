import "server-only";
import { componentSchema, type Finding } from "../../lib/schemas/finding";
import { indicatorById, KNOWLEDGE_VERSION, patterns, resolveSources } from "../../lib/condition/knowledge";

export function buildConditionReview(findings: Finding[]) {
  const tagged = findings.filter((finding) => finding.conditionState === "current").flatMap((finding) => finding.indicatorIds.map((id) => ({ id, finding })));
  const cards = tagged.map(({ id, finding }) => {
    const indicator = indicatorById.get(id)!;
    return { findingId: finding.id, indicatorId: id, priority: indicator.priority,
      alternativeExplanations: indicator.alternativeExplanations, verification: indicator.verification,
      costCatalogIds: indicator.costCatalogIds, costStatus: "scope_confirmation_required" as const,
      sources: resolveSources(indicator.sourceIds) };
  });
  const patternCandidates = patterns.flatMap((pattern) => {
    if (!pattern.allOf.every((group) => tagged.some(({ id }) => group.includes(id)))) return [];
    const relevant = tagged.filter(({ id }) => pattern.allOf.flat().includes(id));
    const supportingFindingIds = Array.from(new Set(relevant.map(({ finding }) => finding.id)));
    if (supportingFindingIds.length < 2) return [];
    return [{ id: pattern.id, status: "hypothesis_requires_verification" as const, hypothesis: pattern.hypothesis,
      supportingFindingIds, verification: pattern.verification,
      limitation: "Co-occurring clues may be unrelated. Their location, timing and shared mechanism have not been verified.",
      sources: resolveSources(pattern.sourceIds) }];
  });
  return { knowledgeVersion: KNOWLEDGE_VERSION, cards, patternCandidates,
    coverage: componentSchema.options.filter((c) => c !== "other").map((component) => ({ component,
      status: findings.some((finding) => finding.component === component && finding.conditionState === "current") ? "observations_only" as const : "no_evidence" as const,
    })),
    limits: ["No component is certified safe or fully inspected.", "Hidden damage requires inspection or testing.", "Repair cost is not a resale-value adjustment."] };
}
