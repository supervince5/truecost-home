import { expect, it } from "vitest";
import { scoreCase } from "../../benchmarks/score";

const expected = { expectedIndicatorIds: ["pipe_boot_damage"], allowedIndicatorIds: ["pipe_boot_damage"], expectedPatternIds: [], requiredUnknownComponents: ["foundation"] };
it("counts a missed defect and an invented tag separately", () => {
  const score = scoreCase(expected, { findings: [{ indicatorIds: ["surface_streaking"] }], conditionReview: { patternCandidates: [], coverage: [{ component: "foundation", status: "no_evidence" }] } });
  expect(score).toMatchObject({ truePositives: 0, falsePositives: 1, falseNegatives: 1, passed: false });
});
it("counts provider/contract failures as failed cases with missed labels", () => {
  expect(scoreCase(expected, null)).toMatchObject({ contractPassed: false, falseNegatives: 1, passed: false });
});
it("requires known gaps and expected cross-system links", () => {
  const score = scoreCase({ ...expected, expectedPatternIds: ["roof_ceiling"] }, { findings: [{ indicatorIds: ["pipe_boot_damage"] }], conditionReview: { patternCandidates: [], coverage: [{ component: "foundation", status: "observations_only" }] } });
  expect(score).toMatchObject({ truePositives: 1, missingPatterns: ["roof_ceiling"], coverageOverclaims: ["foundation"], passed: false });
});
it("does not award defect-detection success for an empty answer", () => {
  expect(scoreCase(expected, { findings: [], conditionReview: { patternCandidates: [], coverage: [] } }).passed).toBe(false);
});
