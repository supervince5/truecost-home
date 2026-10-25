import { extractionRequestSchema, type ExtractionRequest } from "./schemas/extraction";
import type { RepairPlan } from "./engine/cashflow";
export function parseAmount(text: string): number | null {
 if(!text.trim()) return null;
 if(!/^\d+(\.\d{1,2})?$/.test(text.trim())) throw new Error("Enter a nonnegative amount with at most two decimal places.");
 const cents=Math.round(Number(text)*100);
 if(!Number.isSafeInteger(cents) || cents>1_000_000_000_000) throw new Error("Amount is too large.");
 return cents;
}
export function makeEvidenceRequest(input:{listing:string;report:string;yearBuilt:string;images:ExtractionRequest['images']}): ExtractionRequest {
 return extractionRequestSchema.parse({...(input.listing.trim()?{listingText:input.listing.trim()}:{}),reportPages:input.report.trim()?input.report.split('\f').map(p=>p.trim()):[],images:input.images,property:{yearBuilt:input.yearBuilt.trim()?Number(input.yearBuilt):null}});
}
export function selectedPlans(scopes:(RepairPlan & {confirmed:boolean})[]):RepairPlan[] {
 return scopes.filter(s=>s.confirmed).map(({confirmed:_,...s})=>{void _;return s;});
}
