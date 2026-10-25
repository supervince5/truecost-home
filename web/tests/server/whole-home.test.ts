import { expect, it } from "vitest";
import { extractionOutputSchema } from "../../src/lib/schemas/extraction";
import { prepareEvidence } from "../../src/server/evidence/prepare";
import { extract } from "../../src/server/analysis/extract";
import { buildConditionReview } from "../../src/server/condition/review";
import type { ModelProvider } from "../../src/server/model/provider";
import sharp from "sharp";

const finding = (id: string, component: string, indicatorIds: string[], quote: string) => ({ id, component, conditionState: "current", indicatorIds, description: quote, evidenceClass: "reported_inspection_finding", evidence: [{ kind: "report", sourceId: "report-1", page: 1, quote }], needsProfessionalAssessment: true, followUpQuestion: "Can a qualified professional verify the cause and extent?" });

it("accepts whole-property findings including kitchen, landscape and ventilation", () => {
  for (const [component, indicator] of [["kitchen", "cabinet_water_damage"], ["landscaping", "tree_damage"], ["ventilation", "exhaust_into_attic"], ["drainage", "downspout_disconnected"], ["interior", "wall_surface_stain"]]) {
    expect(extractionOutputSchema.safeParse({ findings: [finding("f1", component, [indicator], "Observed damage.")], unassessedComponents: [] }).success).toBe(true);
  }
});
it("rejects invented indicators and tags belonging to another system", () => {
  for (const ids of [["imaginary_defect"], ["tree_damage"]]) expect(extractionOutputSchema.safeParse({ findings: [finding("f1", "roof", ids, "Roof wear.")], unassessedComponents: [] }).success).toBe(false);
});
it("links drainage and basement moisture as a hypothesis with evidence, never a confirmed cause", async () => {
  const output = { findings: [finding("f1", "drainage", ["grade_toward_house"], "Ground slopes toward the house."), finding("f2", "foundation", ["basement_moisture"], "Basement wall is damp.")], unassessedComponents: [] };
  const model: ModelProvider = { modelId: "gemma-4-26b-a4b-it", generate: async () => ({ text: JSON.stringify(output), modelVersion: null, inputTokens: 1, outputTokens: 1 }) };
  const result = await extract(await prepareEvidence({ reportPages: ["Ground slopes toward the house. Basement wall is damp."] }), model);
  expect(result.conditionReview.patternCandidates[0]).toMatchObject({ status: "hypothesis_requires_verification", supportingFindingIds: ["f1", "f2"] });
  expect(result.conditionReview.patternCandidates[0].sources[0].url).toMatch(/^https:\/\//);
  expect(result.conditionReview.coverage.find((x) => x.component === "roof")?.status).toBe("no_evidence");
  expect(result.conditionReview.coverage.find((x) => x.component === "foundation")?.status).toBe("observations_only");
});
it("does not build a multi-system hypothesis from only one clue", () => {
  const parsed = extractionOutputSchema.parse({ findings: [finding("f1", "drainage", ["grade_toward_house"], "Ground slopes toward the house.")], unassessedComponents: [] });
  expect(buildConditionReview(parsed.findings).patternCandidates).toEqual([]);
});
it("keeps cosmetic kitchen age separate from a repair diagnosis", () => {
  const parsed = extractionOutputSchema.parse({ findings: [finding("f1", "kitchen", ["dated_finish"], "Dated cabinet style.")], unassessedComponents: [] });
  const review = buildConditionReview(parsed.findings);
  expect(review.cards[0].priority).toBe("preference_only");
  expect(review.cards[0].costCatalogIds).toEqual([]);
});

it.each(["historical", "resolved", "unknown"])("keeps %s observations out of active repair cards", async (conditionState) => {
  const quote = "A prior plumbing leak was repaired. The sink cabinet is currently dry and undamaged.";
  const output = { findings: [{ ...finding("f1", "kitchen", ["cabinet_water_damage"], quote), conditionState }], unassessedComponents: [] };
  const model: ModelProvider = { modelId: "gemma-4-26b-a4b-it", generate: async () => ({ text: JSON.stringify(output), modelVersion: null, inputTokens: 1, outputTokens: 1 }) };
  const result = await extract(await prepareEvidence({ reportPages: [quote] }), model);
  expect(result.findings[0]).toMatchObject({ conditionState, indicatorIds: [] });
  expect(result.conditionReview.cards).toEqual([]);
  expect(result.unassessedComponents).toContain("kitchen");
  expect(result.conditionReview.coverage.find((entry) => entry.component === "kitchen")?.status).toBe("no_evidence");
  expect(result.conditionReview.patternCandidates).toEqual([]);
});
it("retains present damage even when the leak that caused it was repaired", async () => {
  const quote = "The leak was repaired, but the cabinet base is still swollen and delaminated.";
  const output = { findings: [{ ...finding("f1", "kitchen", ["cabinet_water_damage"], quote), conditionState: "current" }], unassessedComponents: [] };
  const model: ModelProvider = { modelId: "gemma-4-26b-a4b-it", generate: async () => ({ text: JSON.stringify(output), modelVersion: null, inputTokens: 1, outputTokens: 1 }) };
  const result = await extract(await prepareEvidence({ reportPages: [quote] }), model);
  expect(result.conditionReview.cards.map((card) => card.indicatorId)).toEqual(["cabinet_water_damage"]);
});
it("rejects an active-tag response that omitted its condition state", () => {
  const raw = finding("f1", "kitchen", ["cabinet_water_damage"], "Cabinet is swollen.");
  Reflect.deleteProperty(raw, "conditionState");
  expect(extractionOutputSchema.safeParse({ findings: [raw], unassessedComponents: [] }).success).toBe(false);
});

it("does not pass a photo follow-up that assumes a hidden cause to the buyer", async () => {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
  const output = { findings: [{
    id: "f1", component: "other", conditionState: "current", indicatorIds: [],
    description: "A dark surface mark is visible.", evidenceClass: "visual_observation",
    evidence: [{ kind: "image", sourceId: "photo-1" }], needsProfessionalAssessment: true,
    followUpQuestion: "What caused the active pipe leak behind this surface?",
  }], unassessedComponents: [] };
  const model: ModelProvider = { modelId: "gemma-4-26b-a4b-it", generate: async () => ({ text: JSON.stringify(output), modelVersion: null, inputTokens: 1, outputTokens: 1 }) };
  const result = await extract(await prepareEvidence({ images: [{ mimeType: "image/png", data: bytes.toString("base64") }] }), model);
  expect(result.findings[0].followUpQuestion).not.toContain("active pipe leak");
  expect(result.findings[0].followUpQuestion).toContain("qualified professional");
  expect(result.findings[0].description).toBe("A dark surface mark is visible.");
  expect(result.conditionReview.cards).toEqual([]);
});
