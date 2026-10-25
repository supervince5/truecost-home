import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cashAfterClosing,
  dollarsToCents,
  formatUsd,
  monthlyOwnershipCost,
  monthlyPrincipalAndInterest,
  nearTermCashGap,
} from "./ownership.ts";

test("principal and interest matches a standard amortization", () => {
  // $251,750 at 6.5% for 30 years -> $1,591.23
  assert.equal(monthlyPrincipalAndInterest(dollarsToCents(251_750), 6.5, 30), 159_123);
});

test("zero interest divides the loan evenly", () => {
  assert.equal(monthlyPrincipalAndInterest(dollarsToCents(120_000), 0, 10), 100_000);
});

test("no loan means no payment", () => {
  assert.equal(monthlyPrincipalAndInterest(0, 6.5, 30), 0);
});

test("demo home monthly total is $2,021", () => {
  const m = monthlyOwnershipCost({
    price: dollarsToCents(265_000),
    downPayment: dollarsToCents(13_250),
    annualRatePercent: 6.5,
    termYears: 30,
    annualPropertyTax: dollarsToCents(2_400),
    annualInsurance: dollarsToCents(1_500),
    pmiAnnualRatePercent: 0.5,
    otherMonthly: 0,
  });
  assert.equal(m.loan, dollarsToCents(251_750));
  assert.equal(formatUsd(m.total), "$2,021");
});

test("demo cash gap is $4,100 to $9,400 once the stain is removed", () => {
  const cash = cashAfterClosing(dollarsToCents(28_000), dollarsToCents(13_250), dollarsToCents(7_950));
  assert.equal(cash, dollarsToCents(6_800));
  const gap = nearTermCashGap(cash, [
    { low: dollarsToCents(9_500), high: dollarsToCents(14_000) },
    { low: dollarsToCents(1_400), high: dollarsToCents(2_200) },
  ]);
  assert.equal(gap.shortfallLow, dollarsToCents(4_100));
  assert.equal(gap.shortfallHigh, dollarsToCents(9_400));
  assert.equal(gap.hasGap, true);
});

test("cash that covers the high end reports no gap", () => {
  const gap = nearTermCashGap(dollarsToCents(20_000), [{ low: dollarsToCents(1_400), high: dollarsToCents(2_200) }]);
  assert.equal(gap.hasGap, false);
  assert.equal(gap.shortfallHigh, 0);
});

test("partial gap: low end covered, high end short", () => {
  const gap = nearTermCashGap(dollarsToCents(10_000), [{ low: dollarsToCents(9_500), high: dollarsToCents(14_000) }]);
  assert.equal(gap.shortfallLow, 0);
  assert.equal(gap.shortfallHigh, dollarsToCents(4_000));
});

test("invalid ranges are rejected, not silently fixed", () => {
  assert.throws(() => nearTermCashGap(0, [{ low: 500, high: 100 }]));
});

test("negative amounts format with a true minus sign", () => {
  assert.equal(formatUsd(-410_000), "−$4,100");
});
