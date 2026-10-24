import { AppHeader } from "@/components/AppHeader";
import { AnalysisWorkspace } from "@/components/AnalysisWorkspace";
import {
  demoBuyer,
  demoFindings,
  demoLoan,
  demoPhotos,
  demoProperty,
  demoScenarios,
  demoUnassessed,
} from "@/fixtures/demo-analysis";
import { FindingSchema, RepairScenarioSchema } from "@/lib/schemas";

export const metadata = { title: "Review & results · TrueCost Home" };

export default function AnalysisPage() {
  // Same validation the Gemma adapter's output will go through.
  const findings = demoFindings.map((f) => FindingSchema.parse(f));
  const scenarios = demoScenarios.map((s) => RepairScenarioSchema.parse(s));

  return (
    <>
      <AppHeader current={2} />
      <AnalysisWorkspace
        property={demoProperty}
        buyer={demoBuyer}
        loan={demoLoan}
        photos={demoPhotos}
        findings={findings}
        scenarios={scenarios}
        unassessed={demoUnassessed}
      />
    </>
  );
}
