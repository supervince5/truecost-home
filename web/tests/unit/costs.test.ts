import { describe, expect, it } from "vitest";
import { estimateCosts } from "../../src/server/costs/engine";

const date = new Date("2026-10-24T12:00:00Z");
const item = (catalogId: string, quantity = 1) => ({ catalogId, quantity, scopeConfirmed: true });
const request = (items = [item("roof_pipe_boot")], region = "northern_virginia") => ({ region, items });

describe("source-backed cost engine", () => {
  it("returns published cents and provenance without model prices", () => {
    const result = estimateCosts(request(), date);
    expect(result.lines[0]).toMatchObject({ status: "planning_range", lowCents: 25000, highCents: 65000 });
    expect(result.lines[0].source?.url).toContain("rainguardroofs.com");
    expect(result.resaleValueImpact).toBeNull();
  });
  it("multiplies known window count, not house floor area", () => {
    const result = estimateCosts(request([item("window_vinyl", 3)]), date);
    expect(result.subtotal).toEqual({ lowCents: 195000, highCents: 285000 });
  });
  it("does not extrapolate Northern Virginia rates to DC", () => {
    const result = estimateCosts(request(undefined, "dc"), date);
    expect(result.lines[0].status).toBe("region_mismatch");
    expect(result.subtotal).toBeNull();
  });
  it("keeps unpriced work unknown rather than zero", () => {
    const result = estimateCosts(request([item("foundation_underpinning")]), date);
    expect(result.lines[0].status).toBe("quote_required");
    expect(result.subtotal).toBeNull();
    expect(result.complete).toBe(false);
  });
  it("does not silently present a partial subtotal as a whole-home total", () => {
    const result = estimateCosts(request([item("roof_pipe_boot"), item("foundation_underpinning")]), date);
    expect(result.subtotal?.lowCents).toBe(25000);
    expect(result.complete).toBe(false);
    expect(result.total).toBeNull();
  });
  it("refuses unconfirmed repair scope", () => {
    const result = estimateCosts(request([{ ...item("roof_pipe_boot"), scopeConfirmed: false }]), date);
    expect(result.lines[0].status).toBe("scope_required");
  });
  it("does not multiply a per-project range for repeated visits", () => {
    expect(estimateCosts(request([item("roof_pipe_boot", 3)]), date).lines[0].status).toBe("quantity_required");
  });
  it("does not add HVAC alternatives together", () => {
    expect(() => estimateCosts(request([item("hvac_matched"), item("furnace_gas")]), date)).toThrow(/overlap/i);
  });
  it("rejects duplicate scopes and injected prices", () => {
    expect(() => estimateCosts(request([item("roof_pipe_boot"), item("roof_pipe_boot")]), date)).toThrow();
    expect(() => estimateCosts({ ...request(), lowCents: 1 }, date)).toThrow();
  });
  it("requires explicit acceptance of national fallback", () => {
    expect(estimateCosts(request([item("water_heater_tank")]), date).lines[0].status).toBe("national_fallback_required");
    const result = estimateCosts({ ...request([item("water_heater_tank")]), allowNationalFallback: true }, date);
    expect(result.lines[0]).toMatchObject({ lowCents: 160000, highCents: 240000, geography: "us_national" });
  });
  it("blocks old catalog reviews and invalid quantities", () => {
    expect(estimateCosts(request(), new Date("2027-10-24")).lines[0].status).toBe("source_review_required");
    for (const q of [0, -1, Infinity, 1.5]) expect(() => estimateCosts(request([item("window_vinyl", q)]), date)).toThrow();
  });
});
