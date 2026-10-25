import { z } from "zod";
import { budgetSchema } from "../schemas/budget";

const money = z.number().int().nonnegative().max(1_000_000_000_000);
export const repairPlanSchema = z.strictObject({
  id: z.string().min(1), lowCents: money.nullable(), highCents: money.nullable(),
  earliestMonth: z.number().int().min(0).max(60), latestMonth: z.number().int().min(0).max(60),
}).refine(r => r.earliestMonth <= r.latestMonth && (r.lowCents === null || r.highCents === null || r.lowCents <= r.highCents));
const inputSchema = z.strictObject({ priceCents: money.nullable(), budget: budgetSchema,
  repairs: z.array(repairPlanSchema).max(30), unresolved: z.array(z.string()).max(50),
}).refine(i => i.priceCents === null || i.budget.downPaymentCents === null || i.budget.downPaymentCents <= i.priceCents)
  .refine(i => new Set(i.repairs.map(r=>r.id)).size === i.repairs.length)
  .refine(i => Object.values(i.budget).every(v=>v === null || v <= 1_000_000_000_000));
export type CashflowInput = z.infer<typeof inputSchema>;
export type RepairPlan = z.infer<typeof repairPlanSchema>;
export const formatMoney = (cents: number | null) => cents === null ? "Unknown" : new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}).format(cents/100);

/** Integer cents, fixed-rate payment rounded once. No model or assistance assumptions. */
export function monthlyPayment(principal: number, rate: number, months: number) {
  if (principal === 0) return 0;
  const r = rate / 1200;
  return Math.round(r === 0 ? principal / months : principal * r / -Math.expm1(-months * Math.log1p(r)));
}
export function calculateOwnership(raw: CashflowInput) {
  const input = inputSchema.parse(raw), b = input.budget;
  const missingInputs = [...input.unresolved];
  if (input.priceCents === null) missingInputs.push("Home price");
  const noLoan = input.priceCents !== null && b.downPaymentCents === input.priceCents;
  for (const [key,value] of Object.entries(b)) {
    if (value === null && !(noLoan && ["annualInterestRatePercent","loanTermMonths"].includes(key))) missingInputs.push(key);
  }
  for (const repair of input.repairs) if(repair.lowCents === null || repair.highCents === null) missingInputs.push(`Price for ${repair.id}`);
  const principal = input.priceCents !== null && b.downPaymentCents !== null ? input.priceCents-b.downPaymentCents : null;
  const payment = noLoan ? 0 : principal !== null && b.annualInterestRatePercent !== null && b.loanTermMonths !== null ? monthlyPayment(principal,b.annualInterestRatePercent,b.loanTermMonths) : null;
  const monthlyParts = [payment,b.monthlyPropertyTaxCents,b.monthlyInsuranceCents,b.monthlyMortgageInsuranceCents,b.monthlyHoaCents,b.monthlyUtilitiesCents,b.monthlyMaintenanceCents];
  const monthlyOwnershipCents = monthlyParts.every(x=>x !== null) ? monthlyParts.reduce<number>((sum,x)=>sum+x!,0) : null;
  const availableMonthlyRepairContributionCents = monthlyOwnershipCents !== null && b.monthlyHousingBudgetCents !== null ? b.monthlyHousingBudgetCents-monthlyOwnershipCents : null;
  const closingParts=[b.totalPurchaseCashCents,b.downPaymentCents,b.closingCostsCents,b.protectedSavingsCents];
  const cashAfterClosingCents=closingParts.every(x=>x !== null) ? closingParts[0]!-closingParts[1]!-closingParts[2]!-closingParts[3]! : null;
  const knownCostsOnly = input.unresolved.length > 0 || input.repairs.some(r => r.lowCents === null || r.highCents === null);
  const scenarios = (["low_later","central","high_earlier"] as const).map((name,index)=>{
    const expenses=Array<number>(61).fill(0);
    for(const r of input.repairs) {
      if(r.lowCents === null || r.highCents === null) continue;
      const month=index===0?r.latestMonth:index===2?r.earliestMonth:Math.floor((r.earliestMonth+r.latestMonth)/2);
      expenses[month]+=index===0?r.lowCents:index===2?r.highCents:Math.round((r.lowCents+r.highCents)/2);
    }
    const initialBalanceCents=cashAfterClosingCents === null?null:cashAfterClosingCents-expenses[0];
    let balance=initialBalanceCents, firstShortfallMonth=balance !== null && balance <0?0:null;
    let greatestGap=balance === null?null:Math.max(0,-balance), cumulative=0, required=0;
    const timeline = expenses.slice(1).map((expense,i)=>{
      cumulative+=expense;
      if(initialBalanceCents !== null) required=Math.max(required,Math.ceil((cumulative-initialBalanceCents)/(i+1)));
      balance=balance !== null && availableMonthlyRepairContributionCents !== null?balance+availableMonthlyRepairContributionCents-expense:null;
      if(balance !== null && balance <0 && firstShortfallMonth === null) firstShortfallMonth=i+1;
      if(balance !== null) greatestGap=Math.max(greatestGap??0,-balance);
      return {month:i+1,repairCents:expense,balanceCents:balance};
    });
    return {name,knownCostsOnly,initialBalanceCents,immediateCashGapCents:initialBalanceCents === null?null:Math.max(0,-initialBalanceCents),firstShortfallMonth,greatestGapCents:availableMonthlyRepairContributionCents === null ? null : greatestGap,endingBalanceCents:balance,
      requiredMonthlyRepairContributionCents:initialBalanceCents === null?null:Math.max(0,required),
      fiveYearOwnershipCostCents:monthlyOwnershipCents === null || knownCostsOnly?null:monthlyOwnershipCents*60+expenses.reduce((a,n)=>a+n,0),timeline};
  });
  const flags: string[]=[];
  if(missingInputs.length) flags.push("missing_information");
  if((availableMonthlyRepairContributionCents??0)<0) flags.push("monthly_budget_overrun");
  if(scenarios.some(s=>(s.immediateCashGapCents??0)>0)) flags.push("immediate_cash_shortfall");
  if(scenarios.some(s=>s.timeline.some(t=>t.balanceCents !== null && t.balanceCents<0))) flags.push("later_cash_shortfall");
  const status=missingInputs.length?"needs_information":flags.includes("monthly_budget_overrun")?"monthly_budget_overrun":flags.length?"cash_shortfall":"within_stated_budget";
  return {status,flags,missingInputs:[...new Set(missingInputs)],principalAndInterestCents:payment,monthlyOwnershipCents,availableMonthlyRepairContributionCents,cashAfterClosingCents,scenarios};
}
