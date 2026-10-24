import { describe, expect, it } from "vitest";
import cashGap from "../../fixtures/monthly-fit-cash-gap.json";
import withinBudget from "../../fixtures/within-budget.json";
import incomplete from "../../fixtures/insufficient-evidence.json";
import { analysisInputSchema, analysisResultSchema } from "../../src/lib/schemas";

describe("shared analysis contracts", () => {
  it.each([cashGap, withinBudget, incomplete])("accepts the $id synthetic contract", (fixture) => {
    expect(analysisInputSchema.safeParse(fixture.input).success).toBe(true);
    expect(analysisResultSchema.safeParse(fixture.expectedResult).success).toBe(true);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "18000000"])("rejects invalid cents %s", (value) => {
    const input = structuredClone(cashGap.input);
    Object.assign(input.property, { priceCents: value });
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it("preserves unknown costs instead of treating them as zero", () => {
    expect(analysisInputSchema.parse(incomplete.input)).toMatchObject({ budget: { monthlyInsuranceCents: null } });
  });

  it("requires callers to explicitly supply null for unknown budget fields", () => {
    const input = structuredClone(cashGap.input);
    Reflect.deleteProperty(input.budget, "monthlyInsuranceCents");
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects down payment above the home price", () => {
    const input = structuredClone(cashGap.input);
    input.budget.downPaymentCents = input.property.priceCents + 1;
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it.each([-1, 101])("rejects invalid annual percentage %s", (rate) => {
    const input = structuredClone(cashGap.input);
    input.budget.annualInterestRatePercent = rate;
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it.each(["unknown_source", "fabricated_quote", "duplicate_id", "wrong_source_kind", "unsupported_class"])("rejects %s", (defect) => {
    const input = structuredClone(cashGap.input);
    if (defect === "unknown_source") input.findings[0].evidence[0].sourceId = "missing";
    if (defect === "fabricated_quote") input.findings[0].evidence[0].quote = "Roof was replaced yesterday";
    if (defect === "duplicate_id") input.sources.push(input.sources[0]);
    if (defect === "wrong_source_kind") input.findings[0].evidenceClass = "reported_inspection_finding";
    if (defect === "unsupported_class") input.findings[0].evidenceClass = "confirmed_diagnosis";
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it("checks report page bounds and quotation on the specified page", () => {
    const source = { id: "report-1", kind: "inspection_report", pages: ["Ceiling stain observed.", "Roof not accessible."] };
    const finding = { ...cashGap.input.findings[0], evidenceClass: "reported_inspection_finding", evidence: [{ kind: "report", sourceId: "report-1", page: 1, quote: "Ceiling stain observed." }] };
    const input = { ...cashGap.input, sources: [source], findings: [finding] };
    expect(analysisInputSchema.safeParse(input).success).toBe(true);
    finding.evidence[0].page = 2;
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
    finding.evidence[0].page = 3;
    expect(analysisInputSchema.safeParse(input).success).toBe(false);
  });

  it("does not accept a reassuring result with missing information", () => {
    expect(analysisResultSchema.safeParse({ ...incomplete.expectedResult, status: "within_stated_budget" }).success).toBe(false);
  });

  it("rejects a within-budget label with a cash gap", () => {
    expect(analysisResultSchema.safeParse({ ...cashGap.expectedResult, status: "within_stated_budget" }).success).toBe(false);
  });

  it("rejects unspecified payload keys", () => {
    expect(analysisInputSchema.safeParse({ ...cashGap.input, approvedGrantCents: 500000 }).success).toBe(false);
  });
});
