/**
 * DEMO FIXTURE. Illustrative numbers for the hackathon demo, not real buyer
 * data and not a live model result. Replace repair ranges with the versioned
 * cost catalog before presenting them as sourced.
 */
import type { OwnershipInputs } from "@/lib/engine/ownership";
import { dollarsToCents } from "@/lib/engine/ownership";
import type { Finding, Pathway, Photo, RepairScenario, UnassessedComponent } from "@/lib/schemas";

export const demoMode = { label: "Demo: cached analysis", isLive: false } as const;

export const demoProperty = {
  title: "1962 brick ranch",
  priceCents: dollarsToCents(265_000),
  summary: "3 bed · 1.5 bath · 1,240 sq ft",
  listingText: "1962 brick ranch, 3 bed / 1.5 bath, 1,240 sq ft. Roof 2004. Updated kitchen. $265,000.",
};

export const demoBuyer = {
  monthlyBudgetCents: dollarsToCents(2_150),
  savingsCents: dollarsToCents(28_000),
  closingCostsCents: dollarsToCents(7_950),
};

export const demoLoan: OwnershipInputs = {
  price: demoProperty.priceCents,
  downPayment: dollarsToCents(13_250),
  annualRatePercent: 6.5,
  termYears: 30,
  annualPropertyTax: dollarsToCents(2_400),
  annualInsurance: dollarsToCents(1_500),
  pmiAnnualRatePercent: 0.5,
  otherMonthly: 0,
};

export const demoPhotos: Photo[] = [
  { source_id: "photo_1", label: "Photo 1", room: "Front" },
  { source_id: "photo_2", label: "Photo 2", room: "Roof" },
  { source_id: "photo_3", label: "Photo 3", room: "Kitchen" },
  { source_id: "photo_4", label: "Photo 4", room: "Living room" },
  { source_id: "photo_5", label: "Photo 5", room: "Basement" },
  { source_id: "photo_6", label: "Photo 6", room: "Utility room" },
];

export const demoFindings: Finding[] = [
  {
    id: "finding_roof",
    component: "roof",
    title: "Roof near end of typical life",
    description: "Shingles curl along the south edge. The listing dates the roof to 2004, about 22 years ago.",
    evidence_class: "visual_observation",
    evidence: [
      { source_id: "photo_2", kind: "image", label: "Photo 2: curling shingles", region: { x: 18, y: 22, w: 46, h: 34 } },
      { source_id: "listing", kind: "listing_text", label: "Listing text", quote: "Roof 2004" },
    ],
    needs_professional_assessment: true,
    follow_up_question: "How many years does the roof have left, and is there damage under the curled shingles?",
  },
  {
    id: "finding_water_heater",
    component: "water_heater",
    title: "Older water heater",
    description: "The data plate shows a 2011 manufacture date, about 15 years old.",
    evidence_class: "visual_observation",
    evidence: [{ source_id: "photo_6", kind: "image", label: "Photo 6: data plate reads 2011", region: { x: 56, y: 30, w: 18, h: 30 } }],
    needs_professional_assessment: true,
    follow_up_question: "Is the water heater showing corrosion or leaks?",
  },
  {
    id: "finding_ceiling",
    component: "ceiling",
    title: "Possible ceiling water stain",
    description: "A darker patch on the living-room ceiling near the fan.",
    evidence_class: "visual_observation",
    evidence: [{ source_id: "photo_4", kind: "image", label: "Photo 4: dark patch", region: { x: 38, y: 12, w: 22, h: 22 } }],
    needs_professional_assessment: true,
    follow_up_question: "Has the source of the discoloration been assessed?",
  },
];

const DEMO_SOURCE = { label: "Demo cost data", dataset_version: "demo-0" };

export const demoScenarios: RepairScenario[] = [
  { finding_id: "finding_roof", scope: "Asphalt roof replacement", low_cents: dollarsToCents(9_500), high_cents: dollarsToCents(14_000), window_months: { min: 0, max: 36 }, source: DEMO_SOURCE },
  { finding_id: "finding_water_heater", scope: "Tank water heater replacement", low_cents: dollarsToCents(1_400), high_cents: dollarsToCents(2_200), window_months: { min: 0, max: 24 }, source: DEMO_SOURCE },
  { finding_id: "finding_ceiling", scope: "Leak investigation and ceiling repair", low_cents: dollarsToCents(800), high_cents: dollarsToCents(3_500), window_months: { min: 0, max: 12 }, source: DEMO_SOURCE },
];

export const demoUnassessed: UnassessedComponent[] = [
  { component: "foundation", label: "Foundation and drainage", reason: "Not visible in listing photos" },
  { component: "electrical", label: "Electrical panel", reason: "Panel cover closed in photo 6" },
  { component: "sewer", label: "Sewer line", reason: "Needs a camera inspection" },
  { component: "hvac", label: "HVAC age", reason: "No data plate shown" },
];

export const demoPathways: Pathway[] = [
  { id: "seller_credit", title: "Ask for a seller credit", body: "Use the roof finding to request a credit at closing during your inspection period.", effect: "Could cover part of the roof", approved: false },
  { id: "dpa", title: "Check down-payment assistance", body: "A state or local program may lower your cash at closing. Eligibility to confirm with the program.", effect: "Could keep more cash in reserve", approved: false },
  { id: "roof_inspection", title: "Get a roof inspection", body: "A roofer can narrow the 0–3 year window before your contingency deadline.", effect: "Narrows the range", approved: false },
  { id: "counselor", title: "Talk to a housing counselor", body: "HUD-approved counselors offer free or low-cost help with budgets and programs.", effect: "Free second opinion", approved: false },
];
