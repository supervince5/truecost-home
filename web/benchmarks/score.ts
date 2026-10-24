export type Expected = { expectedIndicatorIds: string[]; allowedIndicatorIds: string[]; expectedPatternIds: string[]; requiredUnknownComponents: string[] };
export type Result = { findings: { indicatorIds: string[] }[]; conditionReview: { patternCandidates: { id: string }[]; coverage: { component: string; status: string }[] } };
export function scoreCase(expected: Expected, result: Result | null) {
  const actual = new Set(result?.findings.flatMap((finding) => finding.indicatorIds) ?? []);
  const missed = expected.expectedIndicatorIds.filter((id) => !actual.has(id));
  const unexpected = [...actual].filter((id) => !expected.allowedIndicatorIds.includes(id));
  const actualPatterns = result?.conditionReview.patternCandidates.map((pattern) => pattern.id) ?? [];
  const missingPatterns = expected.expectedPatternIds.filter((id) => !actualPatterns.includes(id));
  const unexpectedPatterns = actualPatterns.filter((id) => !expected.expectedPatternIds.includes(id));
  const coverageOverclaims = expected.requiredUnknownComponents.filter((component) => !result?.conditionReview.coverage.some((entry) => entry.component === component && entry.status === "no_evidence"));
  return { contractPassed: result !== null, truePositives: expected.expectedIndicatorIds.length - missed.length,
    falsePositives: unexpected.length, falseNegatives: missed.length, missed, unexpected, missingPatterns, unexpectedPatterns, coverageOverclaims,
    passed: result !== null && !missed.length && !unexpected.length && !missingPatterns.length && !unexpectedPatterns.length && !coverageOverclaims.length };
}
